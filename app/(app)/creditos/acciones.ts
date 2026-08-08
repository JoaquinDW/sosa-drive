"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { query, transaccion } from "@/lib/db/pool";
import { usuarioActual } from "@/lib/auth";
import { vencimientoDeCuota } from "@/lib/creditos";
import {
  aNumero,
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";
import type { EstadoCredito } from "@/lib/types";

/** Error de regla de negocio: se muestra al usuario tal cual (no es un bug). */
class ErrorNegocio extends Error {}

const ESTADOS_CREDITO_VALIDOS: EstadoCredito[] = [
  "al_dia",
  "en_mora",
  "cancelado",
  "refinanciado",
];

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Revalida todo lo que mira la cartera: cuotas, caja y los KPIs derivados. */
function revalidarCartera(creditoId?: string) {
  revalidatePath("/creditos");
  if (creditoId) revalidatePath(`/creditos/${creditoId}`);
  revalidatePath("/caja");
  revalidatePath("/finanzas");
  revalidatePath("/dashboard");
}

/**
 * Deja las cuotas del crédito alineadas con el plan: cada cuota `i` vence el
 * día de pago acordado, `i - 1` meses después del primer vencimiento.
 *
 * Actualiza las cuotas existentes en lugar de rehacerlas para no perder su id
 * (los cobros de caja lo referencian) ni el registro de qué se pagó y cuándo.
 * `cuotasPagadas`, si viene, redefine cuáles están pagas: las primeras N.
 */
async function regenerarPlan(
  cliente: PoolClient,
  creditoId: string,
  plan: {
    primerVencimiento: string;
    diaPago: number;
    cantidadCuotas: number;
    cuotaMensual: number;
    cuotasPagadas?: number;
  },
) {
  const existentes = await cliente.query<{ numero: number; estado: string }>(
    "select numero, estado from cuotas where credito_id = $1",
    [creditoId],
  );
  const estadoPorNumero = new Map(
    existentes.rows.map((c) => [c.numero, c.estado]),
  );

  const ultimaPaga = Math.max(
    0,
    ...existentes.rows.filter((c) => c.estado === "pagada").map((c) => c.numero),
  );
  if (plan.cantidadCuotas < ultimaPaga) {
    throw new ErrorNegocio(
      `El plan ya tiene cobrada la cuota ${ultimaPaga}: no podés dejarlo en ${plan.cantidadCuotas} cuotas.`,
    );
  }

  for (let numero = 1; numero <= plan.cantidadCuotas; numero++) {
    const vencimiento = vencimientoDeCuota(
      plan.primerVencimiento,
      plan.diaPago,
      numero,
    );
    // Sin `cuotasPagadas` se respeta lo cobrado; con él, pagas son las primeras N.
    const estado =
      plan.cuotasPagadas === undefined
        ? (estadoPorNumero.get(numero) ?? "pendiente")
        : numero <= plan.cuotasPagadas
          ? "pagada"
          : "pendiente";

    if (estadoPorNumero.has(numero)) {
      // La cuota que se marca paga en lote no tiene fecha de cobro conocida:
      // queda vacía en vez de inventarle una (la carga el cobro individual).
      await cliente.query(
        // El cast es necesario: sin él Postgres deduce dos tipos para $3
        // (enum en el `set`, texto en la comparación) y rechaza la consulta.
        `update cuotas
            set vencimiento = $1,
                monto = $2,
                estado = $3::estado_cuota,
                pagada_en = case when $3::estado_cuota = 'pagada' then pagada_en end
          where credito_id = $4 and numero = $5`,
        [vencimiento, plan.cuotaMensual, estado, creditoId, numero],
      );
    } else {
      await cliente.query(
        `insert into cuotas (credito_id, numero, vencimiento, monto, estado)
         values ($1, $2, $3, $4, $5)`,
        [creditoId, numero, vencimiento, plan.cuotaMensual, estado],
      );
    }
  }

  // Un cobro registrado en caja apunta a la cuota: si deja de estar paga, el
  // ingreso también tiene que salir.
  if (plan.cuotasPagadas !== undefined) {
    await cliente.query(
      `delete from movimientos_caja
        where categoria = 'cobro_cuota'
          and referencia in (
            select id::text from cuotas
             where credito_id = $1 and estado <> 'pagada'
          )`,
      [creditoId],
    );
  }

  await cliente.query("delete from cuotas where credito_id = $1 and numero > $2", [
    creditoId,
    plan.cantidadCuotas,
  ]);
}

export async function crearCredito(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const unidadId = String(formData.get("unidadId") ?? "").trim();
  const capital = aNumero(formData.get("capital"));
  const totalAPagar = aNumero(formData.get("totalAPagar"));
  const cantidadCuotas = aNumero(formData.get("cantidadCuotas"));
  const primerVencimiento = String(formData.get("primerVencimiento") ?? "").trim();

  if (
    !clienteId ||
    !unidadId ||
    capital === null ||
    totalAPagar === null ||
    cantidadCuotas === null ||
    cantidadCuotas < 1 ||
    !primerVencimiento
  ) {
    return {
      ok: false,
      error: "Completá cliente, unidad, capital, total a pagar, cantidad de cuotas y primer vencimiento.",
    };
  }

  const usuario = await usuarioActual();
  const montoCuota = Math.round((totalAPagar / cantidadCuotas) * 100) / 100;
  // El día de pago del plan es el del primer vencimiento salvo que se aclare otro.
  const diaPago =
    aNumero(formData.get("diaPago")) ?? Number(primerVencimiento.slice(8, 10));
  if (diaPago < 1 || diaPago > 31) {
    return { ok: false, error: "El día de pago tiene que estar entre 1 y 31." };
  }
  // Manda el día de pago: si el primer vencimiento cae otro día, se corrige.
  const inicio = vencimientoDeCuota(primerVencimiento, diaPago, 1);

  try {
    await transaccion(async (cliente) => {
      const unidad = await cliente.query<{
        marca: string;
        modelo: string;
        dominio: string | null;
        estado: string;
      }>(
        "select marca, modelo, dominio, estado from unidades_inventario where id = $1",
        [unidadId],
      );
      const u = unidad.rows[0];
      if (!u) throw new ErrorNegocio("La unidad seleccionada no existe.");
      if (u.estado !== "disponible") {
        throw new ErrorNegocio("La unidad ya no está disponible para vender.");
      }

      const descripcion = `${u.marca} ${u.modelo}${u.dominio ? ` · ${u.dominio}` : ""}`;

      // La venta descuenta stock y deja kardex (trigger ventas_descuentan_stock).
      const venta = await cliente.query<{ id: string }>(
        `insert into ventas
          (unidad_id, descripcion, cliente_id, precio, metodo, vendedor)
         values ($1, $2, $3, $4, 'credito_casa', $5)
         returning id`,
        [unidadId, descripcion, clienteId, capital, usuario.nombre],
      );

      const credito = await cliente.query<{ id: string }>(
        `insert into creditos
          (venta_id, cliente_id, descripcion_moto, capital, total_a_pagar,
           cuota_mensual, cantidad_cuotas, dia_pago, fecha_inicio)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          venta.rows[0].id,
          clienteId,
          descripcion,
          capital,
          totalAPagar,
          montoCuota,
          cantidadCuotas,
          diaPago,
          inicio,
        ],
      );

      await regenerarPlan(cliente, credito.rows[0].id, {
        primerVencimiento: inicio,
        diaPago,
        cantidadCuotas,
        cuotaMensual: montoCuota,
      });
    });

    revalidarCartera();
    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    return mensajeDeError(error, "No pudimos registrar el crédito.");
  }
}

/**
 * Edita el plan. Si quedan definidos primer vencimiento, día de pago, cantidad
 * de cuotas y cuota mensual, el cronograma se recalcula: es lo que permite
 * saber si el cliente está al día o debe.
 */
export async function actualizarCredito(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get("id") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const descripcionMoto = aTexto(formData.get("descripcionMoto"));
  const cuotaMensual = aNumero(formData.get("cuotaMensual"));
  const cantidadCuotas = aNumero(formData.get("cantidadCuotas"));
  const diaPago = aNumero(formData.get("diaPago"));
  const primerVencimiento = aTexto(formData.get("primerVencimiento"));
  const cuotasPagadas = aNumero(formData.get("cuotasPagadas"));
  const estado = String(formData.get("estado") ?? "") as EstadoCredito;
  const observaciones = aTexto(formData.get("observaciones"));

  if (!id) return { ok: false, error: "Falta identificar el crédito." };
  if (!clienteId) return { ok: false, error: "Elegí el cliente del plan." };
  if (!ESTADOS_CREDITO_VALIDOS.includes(estado)) {
    return { ok: false, error: "Elegí un estado válido." };
  }
  if (diaPago !== null && (diaPago < 1 || diaPago > 31)) {
    return { ok: false, error: "El día de pago tiene que estar entre 1 y 31." };
  }
  if (cantidadCuotas !== null && cantidadCuotas < 1) {
    return { ok: false, error: "El plan tiene que tener al menos una cuota." };
  }
  if (cuotaMensual !== null && cuotaMensual <= 0) {
    return { ok: false, error: "La cuota mensual tiene que ser mayor a cero." };
  }
  if (
    cuotasPagadas !== null &&
    (cuotasPagadas < 0 || (cantidadCuotas !== null && cuotasPagadas > cantidadCuotas))
  ) {
    return {
      ok: false,
      error: "Las cuotas pagadas no pueden ser más que las del plan.",
    };
  }

  const totalAPagar =
    cuotaMensual !== null && cantidadCuotas !== null
      ? cuotaMensual * cantidadCuotas
      : null;

  // Manda el día de pago: si el primer vencimiento cae otro día, se corrige al
  // acordado para que el plan y lo que muestra el formulario coincidan.
  const inicio =
    primerVencimiento !== null && diaPago !== null
      ? vencimientoDeCuota(primerVencimiento, diaPago, 1)
      : primerVencimiento;

  try {
    await transaccion(async (cliente) => {
      await cliente.query(
        `update creditos
            set cliente_id = $1,
                descripcion_moto = $2,
                cuota_mensual = $3,
                cantidad_cuotas = $4,
                total_a_pagar = coalesce($5, total_a_pagar),
                dia_pago = $6,
                fecha_inicio = $7,
                estado = $8,
                observaciones = $9
          where id = $10`,
        [
          clienteId,
          descripcionMoto,
          cuotaMensual,
          cantidadCuotas,
          totalAPagar,
          diaPago,
          inicio,
          estado,
          observaciones,
          id,
        ],
      );

      if (
        inicio !== null &&
        diaPago !== null &&
        cantidadCuotas !== null &&
        cuotaMensual !== null
      ) {
        await regenerarPlan(cliente, id, {
          primerVencimiento: inicio,
          diaPago,
          cantidadCuotas,
          cuotaMensual,
          cuotasPagadas: cuotasPagadas ?? undefined,
        });
      }
    });

    revalidarCartera(id);
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    return mensajeDeError(error, "No pudimos guardar el crédito.");
  }
}

/** Corrige una cuota puntual (una prórroga, un monto distinto). */
export async function actualizarCuota(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get("id") ?? "").trim();
  const vencimiento = aTexto(formData.get("vencimiento"));
  const monto = aNumero(formData.get("monto"));

  if (!id) return { ok: false, error: "Falta identificar la cuota." };
  if (!vencimiento) return { ok: false, error: "Poné la fecha de vencimiento." };
  if (monto === null || monto <= 0) {
    return { ok: false, error: "El monto tiene que ser mayor a cero." };
  }

  try {
    const filas = await query<{ credito_id: string }>(
      `update cuotas set vencimiento = $1, monto = $2
        where id = $3
        returning credito_id`,
      [vencimiento, monto, id],
    );
    if (!filas[0]) return { ok: false, error: "La cuota ya no existe." };
    revalidarCartera(filas[0].credito_id);
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos guardar la cuota.");
  }
}

/** Cobra una cuota: la marca pagada y deja el ingreso en caja. */
export async function registrarPagoCuota(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Falta identificar la cuota." };
  const fechaPago = aTexto(formData.get("fechaPago")) ?? hoyISO();
  const monto = aNumero(formData.get("monto"));

  try {
    const creditoId = await transaccion(async (cliente) => {
      const cuota = await cliente.query<{
        credito_id: string;
        numero: number;
        monto: string;
        estado: string;
        cantidad_cuotas: number | null;
        nombre: string;
      }>(
        `select c.credito_id, c.numero, c.monto, c.estado,
                cr.cantidad_cuotas, cl.nombre
           from cuotas c
           join creditos cr on cr.id = c.credito_id
           join clientes_operaciones cl on cl.id = cr.cliente_id
          where c.id = $1`,
        [id],
      );
      const fila = cuota.rows[0];
      if (!fila) throw new ErrorNegocio("La cuota ya no existe.");
      if (fila.estado === "pagada") {
        throw new ErrorNegocio("Esa cuota ya figura cobrada.");
      }

      const importe = monto ?? Number(fila.monto);
      await cliente.query(
        "update cuotas set estado = 'pagada', pagada_en = $1, monto = $2 where id = $3",
        [fechaPago, importe, id],
      );
      await cliente.query(
        `insert into movimientos_caja
          (fecha, tipo, categoria, descripcion, monto, referencia)
         values ($1, 'ingreso', 'cobro_cuota', $2, $3, $4)`,
        [
          fechaPago,
          `Cuota ${fila.numero}${fila.cantidad_cuotas ? `/${fila.cantidad_cuotas}` : ""} — ${fila.nombre}`,
          importe,
          id,
        ],
      );
      return fila.credito_id;
    });

    revalidarCartera(creditoId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    return mensajeDeError(error, "No pudimos registrar el pago.");
  }
}

/** Deshace un cobro mal cargado: vuelve la cuota a pendiente y saca el ingreso. */
export async function revertirPagoCuota(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Falta identificar la cuota." };

  try {
    const creditoId = await transaccion(async (cliente) => {
      const cuota = await cliente.query<{ credito_id: string }>(
        `update cuotas set estado = 'pendiente', pagada_en = null
          where id = $1 and estado = 'pagada'
          returning credito_id`,
        [id],
      );
      const fila = cuota.rows[0];
      if (!fila) throw new ErrorNegocio("Esa cuota no figura cobrada.");
      await cliente.query(
        "delete from movimientos_caja where categoria = 'cobro_cuota' and referencia = $1",
        [id],
      );
      return fila.credito_id;
    });

    revalidarCartera(creditoId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    return mensajeDeError(error, "No pudimos deshacer el pago.");
  }
}
