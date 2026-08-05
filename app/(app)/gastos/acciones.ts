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

export async function crearGasto(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const fecha = String(formData.get("fecha") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const metodoPago = String(formData.get("metodoPago") ?? "").trim();
  const importe = aNumero(formData.get("importe"));

  if (!fecha || !categoria || !descripcion || !metodoPago || importe === null) {
    return { ok: false, error: "Completá fecha, categoría, importe, descripción y método de pago." };
  }

  const usuario = await usuarioActual();

  try {
    await query(
      `insert into gastos (fecha, categoria, importe, descripcion, metodo_pago, responsable, proveedor)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        fecha,
        categoria,
        importe,
        descripcion,
        metodoPago,
        usuario.nombre,
        aTexto(formData.get("proveedor")),
      ],
    );
    revalidatePath("/gastos");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos registrar el gasto.");
  }
}
