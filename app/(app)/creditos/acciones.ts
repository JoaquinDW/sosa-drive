"use server";

import { revalidatePath } from "next/cache";
import { transaccion } from "@/lib/db/pool";
import { usuarioActual } from "@/lib/auth";
import {
  aNumero,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";

/** Error de regla de negocio: se muestra al usuario tal cual (no es un bug). */
class ErrorNegocio extends Error {}

/** Suma `meses` a una fecha ISO (YYYY-MM-DD) y devuelve otra fecha ISO. */
function sumarMeses(iso: string, meses: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1 + meses, dia))
    .toISOString()
    .slice(0, 10);
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
          (venta_id, cliente_id, capital, total_a_pagar, cantidad_cuotas)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [venta.rows[0].id, clienteId, capital, totalAPagar, cantidadCuotas],
      );

      const creditoId = credito.rows[0].id;
      for (let i = 0; i < cantidadCuotas; i++) {
        await cliente.query(
          `insert into cuotas (credito_id, numero, vencimiento, monto)
           values ($1, $2, $3, $4)`,
          [creditoId, i + 1, sumarMeses(primerVencimiento, i), montoCuota],
        );
      }
    });

    revalidatePath("/creditos");
    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    return mensajeDeError(error, "No pudimos registrar el crédito.");
  }
}
