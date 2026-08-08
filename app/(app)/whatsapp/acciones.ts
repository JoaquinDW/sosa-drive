"use server";

import { revalidatePath } from "next/cache";
import { query, transaccion } from "@/lib/db/pool";
import { getRedis } from "@/lib/db/redis";
import { usuarioActual } from "@/lib/auth";
import { mensajeDeError, type EstadoFormulario } from "@/lib/acciones/estado";
import type { ModoWa } from "@/lib/types";

const MODOS_VALIDOS: ModoWa[] = ["ia", "humano"];

/** Resguardo común: el middleware ya exige cookie, esto valida la sesión real. */
async function actorValido(): Promise<EstadoFormulario | null> {
  const actor = await usuarioActual();
  if (!actor.id) {
    return { ok: false, error: "Tu sesión venció. Iniciá sesión de nuevo." };
  }
  return null;
}

export async function cambiarModoConversacion(
  id: string,
  modo: ModoWa,
): Promise<EstadoFormulario> {
  const invalido = await actorValido();
  if (invalido) return invalido;
  if (!MODOS_VALIDOS.includes(modo)) {
    return { ok: false, error: "Elegí un modo válido." };
  }

  try {
    await query("update wa_conversaciones set modo = $1 where id = $2", [
      modo,
      id,
    ]);
    revalidatePath("/whatsapp");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos cambiar el modo.");
  }
}

/**
 * Envía un mensaje como persona (modo humano): lo guarda en la DB (para verlo
 * al instante en el panel) y lo encola en Redis; el bot lo saca de la cola y
 * lo manda por Baileys.
 */
export async function enviarMensajeHumano(
  id: string,
  contenido: string,
): Promise<EstadoFormulario> {
  // Acá el actor no alcanza con validarlo: su nombre firma el evento que queda
  // en el timeline del lead.
  const actor = await usuarioActual();
  if (!actor.id) {
    return { ok: false, error: "Tu sesión venció. Iniciá sesión de nuevo." };
  }

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "Escribí un mensaje." };

  try {
    const filas = await query<{ telefono: string; lead_id: string | null }>(
      "select telefono, lead_id from wa_conversaciones where id = $1",
      [id],
    );
    const conversacion = filas[0];
    if (!conversacion) {
      return { ok: false, error: "La conversación ya no existe." };
    }
    const { telefono, lead_id: leadId } = conversacion;

    await transaccion(async (cliente) => {
      await cliente.query(
        "insert into wa_mensajes (conversacion_id, rol, contenido) values ($1, 'humano', $2)",
        [id, texto],
      );
      await cliente.query(
        "update wa_conversaciones set ultimo_mensaje_en = now() where id = $1",
        [id],
      );

      // Que la respuesta de una persona también quede en el timeline del lead:
      // el vendedor que abre /leads/[id] ve la conversación completa, no solo
      // lo que hizo el bot.
      if (leadId) {
        await cliente.query(
          `insert into eventos_lead (lead_id, tipo, descripcion, actor)
           values ($1, 'mensaje', $2, $3)`,
          [leadId, `Respondió por WhatsApp: "${texto.slice(0, 200)}"`, actor.nombre],
        );
        await cliente.query(
          "update leads set ultimo_contacto_en = now(), actualizado_en = now() where id = $1",
          [leadId],
        );
      }
    });

    const redis = await getRedis();
    await redis.lPush("wa:outbox", JSON.stringify({ telefono, contenido: texto }));

    revalidatePath("/whatsapp");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos enviar el mensaje.");
  }
}

export async function eliminarConversacionWa(
  id: string,
): Promise<EstadoFormulario> {
  const invalido = await actorValido();
  if (invalido) return invalido;

  try {
    // El on delete cascade borra también sus mensajes.
    await query("delete from wa_conversaciones where id = $1", [id]);
    revalidatePath("/whatsapp");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos borrar la conversación.");
  }
}

/**
 * Desconexión manual: encola la señal de restart; el bot cierra la sesión de
 * Baileys, borra la carpeta auth/ y genera un QR nuevo.
 */
export async function desconectarWhatsapp(): Promise<EstadoFormulario> {
  const invalido = await actorValido();
  if (invalido) return invalido;

  try {
    const redis = await getRedis();
    await redis.lPush("wa:control", "restart");
    revalidatePath("/whatsapp");
    return { ok: true };
  } catch (error) {
    return mensajeDeError(error, "No pudimos desconectar.");
  }
}
