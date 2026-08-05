"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import {
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";

export async function crearCliente(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { ok: false, error: "El nombre es obligatorio." };
  }

  try {
    await query(
      `insert into clientes_operaciones (nombre, telefono, dni, observaciones)
       values ($1, $2, $3, $4)`,
      [
        nombre,
        aTexto(formData.get("telefono")),
        aTexto(formData.get("dni")),
        aTexto(formData.get("observaciones")),
      ],
    );
    revalidatePath("/clientes");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos registrar el cliente.");
  }
}
