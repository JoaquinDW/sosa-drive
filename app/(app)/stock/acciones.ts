"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import { usuarioActual } from "@/lib/auth";
import {
  aNumero,
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";
import { UBICACIONES_UNIDAD } from "@/lib/labels";
import type { UbicacionUnidad } from "@/lib/types";

export async function crearUnidad(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const marca = String(formData.get("marca") ?? "").trim();
  const modelo = String(formData.get("modelo") ?? "").trim();
  if (!marca || !modelo) {
    return { ok: false, error: "La marca y el modelo son obligatorios." };
  }

  const condicion = String(formData.get("condicion") ?? "usada");
  const ubicacion = String(formData.get("ubicacion") ?? "salon") as UbicacionUnidad;
  const usuario = await usuarioActual();

  try {
    const filas = await query<{ id: string }>(
      `insert into unidades_inventario
        (marca, modelo, anio, dominio, numero_cuadro, color, condicion,
         ubicacion, precio_compra, precio_venta, observaciones)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id`,
      [
        marca,
        modelo,
        aNumero(formData.get("anio")),
        aTexto(formData.get("dominio")),
        aTexto(formData.get("numeroCuadro")),
        aTexto(formData.get("color")) ?? "",
        condicion,
        ubicacion,
        aNumero(formData.get("precioCompra")),
        aNumero(formData.get("precioVenta")),
        aTexto(formData.get("observaciones")),
      ],
    );

    // El alta deja rastro en el kardex (y, por trigger, en auditoría).
    await query(
      `insert into movimientos_inventario (unidad_id, tipo, destino, motivo, usuario)
       values ($1, 'ingreso', $2, 'Alta manual de unidad', $3)`,
      [filas[0].id, UBICACIONES_UNIDAD[ubicacion], usuario.nombre],
    );

    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(
      error,
      "Ya existe una unidad con ese dominio o número de cuadro.",
    );
  }
}

export async function crearCompra(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proveedor = String(formData.get("proveedor") ?? "").trim();
  const factura = String(formData.get("factura") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const formaPago = String(formData.get("formaPago") ?? "").trim();
  const costoTotal = aNumero(formData.get("costoTotal"));

  if (!proveedor || !factura || !fecha || !formaPago || costoTotal === null) {
    return { ok: false, error: "Completá proveedor, factura, fecha, costo y forma de pago." };
  }

  try {
    await query(
      `insert into compras (proveedor, factura, fecha, costo_total, forma_pago, observaciones)
       values ($1, $2, $3, $4, $5, $6)`,
      [proveedor, factura, fecha, costoTotal, formaPago, aTexto(formData.get("observaciones"))],
    );
    revalidatePath("/stock");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos registrar la compra.");
  }
}
