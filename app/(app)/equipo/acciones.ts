"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";
import { usuarioActual } from "@/lib/auth";
import type { Rol } from "@/lib/types";
import {
  aTexto,
  mensajeDeError,
  type EstadoFormulario,
} from "@/lib/acciones/estado";

const ROLES_VALIDOS: Rol[] = [
  "gerente",
  "vendedor",
  "administracion",
  "contabilidad",
  "taller",
];

export async function crearMiembroEquipo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const actor = await usuarioActual();
  if (actor.rol !== "gerente") {
    return {
      ok: false,
      error: "Solo un gerente puede agregar personas al equipo.",
    };
  }

  const nombre = aTexto(formData.get("nombre"));
  const email = aTexto(formData.get("email"))?.toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "") as Rol;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!email) return { ok: false, error: "El email es obligatorio." };
  if (password.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return { ok: false, error: "Elegí un área válida." };
  }

  try {
    const passwordHash = await hashPassword(password);
    await query(
      `insert into perfiles (nombre, email, password_hash, rol)
       values ($1, $2, $3, $4)`,
      [nombre, email, passwordHash, rol],
    );
    revalidatePath("/equipo");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "Ya existe una persona con ese email.");
  }
}

export async function actualizarMiembroEquipo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const actor = await usuarioActual();
  if (actor.rol !== "gerente") {
    return { ok: false, error: "Solo un gerente puede editar el equipo." };
  }

  const id = String(formData.get("id") ?? "");
  const nombre = aTexto(formData.get("nombre"));
  const email = aTexto(formData.get("email"))?.toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "") as Rol;

  if (!id) return { ok: false, error: "Falta identificar a la persona." };
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!email) return { ok: false, error: "El email es obligatorio." };
  if (!ROLES_VALIDOS.includes(rol)) {
    return { ok: false, error: "Elegí un área válida." };
  }
  if (password && password.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }
  if (rol !== "gerente" && (await esUltimoGerenteActivo(id))) {
    return { ok: false, error: "Debe quedar al menos un gerente activo." };
  }

  try {
    if (password) {
      const passwordHash = await hashPassword(password);
      await query(
        `update perfiles set nombre = $1, email = $2, rol = $3, password_hash = $4
         where id = $5`,
        [nombre, email, rol, passwordHash, id],
      );
    } else {
      await query(
        `update perfiles set nombre = $1, email = $2, rol = $3 where id = $4`,
        [nombre, email, rol, id],
      );
    }
    revalidatePath("/equipo");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "Ya existe una persona con ese email.");
  }
}

/**
 * Borrar el perfil físicamente arrastraría en cascada sus tareas asignadas
 * (`tareas.vendedor_id` es `on delete cascade`). Por eso "eliminar" acá
 * desactiva el acceso: no puede loguearse, pero se conserva su historial y
 * se puede reactivar.
 */
export async function eliminarMiembroEquipo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  return cambiarEstadoMiembroEquipo(formData, false);
}

export async function reactivarMiembroEquipo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  return cambiarEstadoMiembroEquipo(formData, true);
}

async function cambiarEstadoMiembroEquipo(
  formData: FormData,
  activo: boolean,
): Promise<EstadoFormulario> {
  const actor = await usuarioActual();
  if (actor.rol !== "gerente") {
    return { ok: false, error: "Solo un gerente puede hacer esto." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta identificar a la persona." };

  if (!activo) {
    if (id === actor.id) {
      return { ok: false, error: "No podés eliminar tu propio acceso." };
    }
    if (await esUltimoGerenteActivo(id)) {
      return { ok: false, error: "Debe quedar al menos un gerente activo." };
    }
  }

  await query("update perfiles set activo = $1 where id = $2", [activo, id]);
  revalidatePath("/equipo");
  return { ok: true };
}

/** True si `id` es un gerente activo y no queda ningún otro gerente activo. */
async function esUltimoGerenteActivo(id: string): Promise<boolean> {
  const filas = await query<{ rol: Rol; activo: boolean }>(
    "select rol, activo from perfiles where id = $1",
    [id],
  );
  const perfil = filas[0];
  if (!perfil || perfil.rol !== "gerente" || !perfil.activo) return false;

  const otros = await query<{ count: string }>(
    `select count(*)::text as count from perfiles
     where rol = 'gerente' and activo = true and id <> $1`,
    [id],
  );
  return Number(otros[0]?.count ?? 0) === 0;
}
