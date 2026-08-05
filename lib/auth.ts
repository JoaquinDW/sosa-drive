import "server-only";

import { query } from "./db/pool";
import { obtenerSesion } from "./auth/session";

export interface UsuarioActual {
  id: string;
  nombre: string;
  rol: "gerente" | "vendedor";
}

interface FilaPerfil {
  id: string;
  nombre: string;
  rol: "gerente" | "vendedor";
}

export async function usuarioActual(): Promise<UsuarioActual> {
  const userId = await obtenerSesion();

  if (!userId) {
    // El middleware redirige a /login; esto es solo un resguardo.
    return { id: "", nombre: "Invitado", rol: "vendedor" };
  }

  const filas = await query<FilaPerfil>(
    "select id, nombre, rol from perfiles where id = $1",
    [userId],
  );
  const perfil = filas[0];

  if (!perfil) {
    return { id: "", nombre: "Invitado", rol: "vendedor" };
  }

  return { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol };
}
