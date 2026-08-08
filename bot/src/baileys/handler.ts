import {
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isLidUser,
  isPnUser,
  normalizeMessageContent,
  type WAMessage,
  type WAMessageKey,
  type WASocket,
} from "@whiskeysockets/baileys";
import {
  getHistorialReciente,
  getModo,
  getOrCreateConversacion,
  insertarMensaje,
} from "../db.js";
import { generarRespuesta } from "../openai.js";
import { extraerDatos } from "../extraccion.js";
import {
  actualizarLeadDesdeExtraccion,
  bloqueDatosConocidos,
  getOrCreateLead,
  type LeadConversacion,
} from "../leads.js";

export function registrarHandlers(sock: WASocket): void {
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // Solo mensajes nuevos en vivo; 'append'/'replace' son historial.
    if (type !== "notify") {
      console.log(`[bot] upsert '${type}' ignorado (${messages.length} mensajes)`);
      return;
    }
    for (const msg of messages) {
      try {
        await procesarMensaje(sock, msg);
      } catch (err) {
        console.error("[bot] error procesando mensaje:", err);
      }
    }
  });
}

/**
 * Desenvuelve los wrappers de Baileys (mensajes efímeros, ver una vez) y saca
 * el texto plano. Sin normalizar, un chat con mensajes temporales activados
 * llega como `ephemeralMessage` y se ve como si no tuviera texto.
 */
function extraerTexto(msg: WAMessage): string | null {
  const contenido = normalizeMessageContent(msg.message);
  return contenido?.conversation ?? contenido?.extendedTextMessage?.text ?? null;
}

/**
 * Número de teléfono del chat.
 *
 * Baileys 7 direcciona los chats 1:1 de dos formas según cómo esté migrada la
 * cuenta: por número (`@s.whatsapp.net`) o por LID (`@lid`), un identificador
 * opaco que NO es el teléfono. Para el LID el número real viene en
 * `remoteJidAlt`, y si no está se pide al mapa LID→PN de la sesión.
 */
async function resolverTelefono(sock: WASocket, key: WAMessageKey): Promise<string> {
  const jid = key.remoteJid ?? "";
  if (isPnUser(jid)) return jid.split("@")[0];

  if (key.remoteJidAlt && isPnUser(key.remoteJidAlt)) {
    return key.remoteJidAlt.split("@")[0];
  }

  try {
    const pn = await sock.signalRepository.lidMapping.getPNForLID(jid);
    if (pn) return pn.split("@")[0];
  } catch (err) {
    console.warn(`[bot] no se pudo resolver el número de ${jid}:`, err);
  }

  // Sin número: se guarda el LID crudo antes que perder el mensaje. El panel
  // muestra ese identificador en vez del teléfono hasta que WhatsApp lo mapee.
  console.warn(`[bot] sin número para ${jid}, se guarda con el LID`);
  return jid.split("@")[0];
}

async function procesarMensaje(sock: WASocket, msg: WAMessage): Promise<void> {
  if (msg.key.fromMe) return;

  const jid = msg.key.remoteJid ?? "";

  // Fuera de scope v1: grupos, estados/difusión y canales.
  if (isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)) return;

  // Chats 1:1, en cualquiera de sus dos direccionamientos.
  if (!isPnUser(jid) && !isLidUser(jid)) {
    console.warn(`[bot] jid no soportado, mensaje ignorado: ${jid}`);
    return;
  }

  const texto = extraerTexto(msg);
  if (!texto) {
    // Audio/imagen/sticker/ubicación: fuera de scope v1, pero conviene verlo
    // en los logs para no confundirlo con un mensaje perdido.
    console.log(`[bot] mensaje sin texto de ${jid}, ignorado`);
    return;
  }

  const telefono = await resolverTelefono(sock, msg.key);
  console.log(`[bot] ← mensaje de ${telefono} (${jid}): ${texto.slice(0, 80)}`);

  const conversacion = await getOrCreateConversacion(telefono, jid, msg.pushName ?? undefined);
  await insertarMensaje(conversacion.id, "cliente", texto);

  // Cada conversación tiene su lead en el CRM. Si esto falla, el bot igual
  // atiende: perder la ficha es malo, dejar al cliente sin respuesta es peor.
  let lead: LeadConversacion | null = null;
  try {
    lead = await getOrCreateLead(conversacion.id, telefono, msg.pushName ?? null);
  } catch (err) {
    console.error("[bot] no se pudo crear/vincular el lead:", err);
  }

  // Re-leer el modo: el toggle del panel pudo cambiar desde que llegó el mensaje.
  const modo = await getModo(conversacion.id);
  if (modo !== "ia") {
    console.log(`[bot] conversación de ${telefono} en modo humano: no se responde`);
    // El cualificador sigue trabajando aunque conteste una persona: los datos
    // que el cliente suelta en esa charla también van a la ficha.
    await cualificar(conversacion.id, lead, msg.pushName ?? null);
    return;
  }

  let respuesta: string;
  try {
    const historial = await getHistorialReciente(conversacion.id);
    respuesta = await generarRespuesta(historial, lead && bloqueDatosConocidos(lead));
  } catch (err) {
    console.error("[bot] error del LLM (no se responde):", err);
    return;
  }

  await insertarMensaje(conversacion.id, "ia", respuesta);
  // Responder al jid original: si el chat vino por LID, mandar al número
  // reconstruido abre una conversación distinta.
  await sock.sendMessage(jid, { text: respuesta });
  console.log(`[bot] → enviado a ${telefono}`);

  // Después de responder: no le suma latencia al cliente.
  await cualificar(conversacion.id, lead, msg.pushName ?? null);
}

/**
 * Segunda pasada al LLM: relee la conversación, extrae los datos del
 * interesado y los vuelca en el lead. Nunca tira — es trabajo de trastienda.
 */
async function cualificar(
  conversacionId: string,
  lead: LeadConversacion | null,
  nombreWa: string | null,
): Promise<void> {
  if (!lead) return;
  try {
    const historial = await getHistorialReciente(conversacionId);
    const datos = await extraerDatos(historial);
    if (!datos) return;
    await actualizarLeadDesdeExtraccion(lead, datos, nombreWa);
  } catch (err) {
    console.error("[bot] error cualificando el lead:", err);
  }
}
