"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import {
  aNumero,
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";

export async function crearMovimientoCaja(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const fecha = String(formData.get("fecha") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const monto = aNumero(formData.get("monto"));

  if (!fecha || !tipo || !categoria || !descripcion || monto === null) {
    return { ok: false, error: "Completá fecha, tipo, categoría, descripción y monto." };
  }

  try {
    await query(
      `insert into movimientos_caja (fecha, tipo, categoria, descripcion, monto, referencia)
       values ($1, $2, $3, $4, $5, $6)`,
      [fecha, tipo, categoria, descripcion, monto, aTexto(formData.get("referencia"))],
    );
    revalidatePath("/caja");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos registrar el movimiento.");
  }
}
