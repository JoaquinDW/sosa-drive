import OpenAI from "openai";
import { construirSystemPrompt } from "./system-prompt.js";
import type { MensajeHistorial } from "./db.js";

// Lazy: si falta OPENAI_API_KEY el error aparece al primer mensaje (logueado
// por el handler) en vez de tirar abajo todo el bot al arrancar.
let cliente: OpenAI | null = null;

/** Cliente compartido con la pasada de extracción (src/extraccion.ts). */
export function getCliente(): OpenAI {
  cliente ??= new OpenAI();
  return cliente;
}

/**
 * Genera la respuesta del bot a partir del historial reciente. Los mensajes
 * 'ia' y 'humano' se mapean a assistant: para el LLM ambos salieron del lado
 * del negocio.
 */
export async function generarRespuesta(
  historial: MensajeHistorial[],
  datosConocidos: string | null = null,
): Promise<string> {
  const mensajes = [
    { role: "system" as const, content: await construirSystemPrompt(datosConocidos) },
    ...historial.map((m) => ({
      role: m.rol === "cliente" ? ("user" as const) : ("assistant" as const),
      content: m.contenido,
    })),
  ];

  console.log(`[bot] llamando LLM con ${mensajes.length} mensajes`);
  const inicio = Date.now();
  const res = await getCliente().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: mensajes,
  });
  console.log(`[bot] LLM respondió en ${Date.now() - inicio}ms`);

  const texto = res.choices[0]?.message?.content?.trim();
  if (!texto) throw new Error("el LLM devolvió una respuesta vacía");
  return texto;
}
