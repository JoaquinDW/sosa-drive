"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import {
  aNumero,
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";

export async function crearOrdenTaller(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const clienteNombre = String(formData.get("clienteNombre") ?? "").trim();
  const motoDescripcion = String(formData.get("motoDescripcion") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const mecanico = String(formData.get("mecanico") ?? "").trim();

  if (!clienteNombre || !motoDescripcion || !motivo || !mecanico) {
    return { ok: false, error: "Completá cliente, moto, motivo y mecánico." };
  }

  const prioridad = String(formData.get("prioridad") ?? "media");
  const unidadRaw = aTexto(formData.get("unidadId"));
  const unidadId = unidadRaw && unidadRaw !== "__ninguna__" ? unidadRaw : null;

  try {
    await query(
      `insert into ordenes_taller
        (cliente_nombre, moto_descripcion, motivo, mecanico, prioridad, unidad_id, fecha_estimada)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        clienteNombre,
        motoDescripcion,
        motivo,
        mecanico,
        prioridad,
        unidadId,
        aTexto(formData.get("fechaEstimada")),
      ],
    );
    revalidatePath("/taller");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos crear la orden de trabajo.");
  }
}

export async function crearRepuesto(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const codigo = String(formData.get("codigo") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  if (!codigo || !nombre || !categoria) {
    return { ok: false, error: "Completá código, nombre y categoría." };
  }

  try {
    await query(
      `insert into repuestos
        (codigo, nombre, categoria, marca, proveedor, costo, precio, cantidad, stock_minimo, ubicacion)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        codigo,
        nombre,
        categoria,
        aTexto(formData.get("marca")),
        aTexto(formData.get("proveedor")),
        aNumero(formData.get("costo")) ?? 0,
        aNumero(formData.get("precio")) ?? 0,
        aNumero(formData.get("cantidad")) ?? 0,
        aNumero(formData.get("stockMinimo")) ?? 0,
        aTexto(formData.get("ubicacion")) ?? "",
      ],
    );
    revalidatePath("/taller");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "Ya existe un repuesto con ese código.");
  }
}
