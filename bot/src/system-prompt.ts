import { readFile } from "node:fs/promises";
import { obtenerCatalogoTexto } from "./catalogo.js";

/**
 * El "cerebro" del bot se arma en dos capas:
 *
 * 1. `project.md` — la info del negocio (tono, reglas, horarios, qué no decir).
 *    Lo edita el negocio, sin tocar código. Ver bot/README.md.
 * 2. El catálogo en vivo de `motos` — precios y disponibilidad reales, para que
 *    el bot no tenga que derivar cada consulta de precio.
 *
 * Se re-arma en cada mensaje a propósito: editar project.md aplica al toque, sin
 * reiniciar el contenedor (el bind mount del compose ya lo expone adentro).
 */

const RUTA_PROJECT_MD = new URL("../project.md", import.meta.url);

// Último project.md leído con éxito: si el archivo se rompe o desaparece a mitad
// de una charla, el bot sigue con la versión buena en vez de quedarse mudo.
let ultimoProjectMd: string | null = null;

const FALLBACK = `
Sos el asistente virtual de Sosa Motos, una concesionaria de motos en Corrientes Capital.
Atendés por WhatsApp en español rioplatense (vos, no tú), en mensajes de 2 a 4 líneas y sin emojis.
No inventes precios, disponibilidad ni fechas de entrega, y no des condiciones de financiación.
Ante cualquier duda respondé: "Dejame derivarte con una persona del equipo."
`.trim();

async function leerProjectMd(): Promise<string> {
  try {
    ultimoProjectMd = await readFile(RUTA_PROJECT_MD, "utf8");
  } catch (err) {
    if (ultimoProjectMd === null) {
      console.error("[bot] no se pudo leer project.md, uso el prompt mínimo:", err);
      return FALLBACK;
    }
    console.error("[bot] no se pudo releer project.md, sigo con la última versión buena:", err);
  }
  return ultimoProjectMd;
}

function bloqueCatalogo(catalogo: string | null): string {
  if (catalogo === null) {
    return [
      "## Catálogo",
      "",
      "No hay catálogo disponible en este momento.",
      "NO des precios ni disponibilidad de ningún modelo: derivá a un asesor.",
    ].join("\n");
  }

  return [
    "## Catálogo en vivo (motos 0 km)",
    "",
    "Precios de CONTADO, actualizados desde el sistema. Reglas de uso:",
    "",
    "- Podés dar el precio de contado de cualquier modelo de esta lista, tal cual figura.",
    "- Es la única fuente de precios que tenés. Un modelo que no está acá: no inventes",
    "  precio ni digas que no lo vendemos, derivá a un asesor.",
    "- La disponibilidad es orientativa. Podés decir que hay unidades, pero NUNCA",
    "  reserves ni prometas que una moto va a estar: eso lo confirma el asesor.",
    '- "sin unidades disponibles" NO es "no la vendemos": ofrecé consultar por encargue.',
    "- Estos precios son de contado y de motos 0 km. Financiación, cuotas, anticipo y",
    "  usadas van SIEMPRE a un asesor, aunque el modelo figure acá.",
    "",
    catalogo,
  ].join("\n");
}

/**
 * `datosConocidos` es la tercera capa: la ficha del lead que el bot ya cargó en
 * el CRM (src/leads.ts). Va al final para que el bot no repregunte algo que ya
 * está guardado. Null cuando el lead todavía está vacío.
 */
export async function construirSystemPrompt(
  datosConocidos: string | null = null,
): Promise<string> {
  const [projectMd, catalogo] = await Promise.all([leerProjectMd(), obtenerCatalogoTexto()]);
  const bloques = [projectMd, bloqueCatalogo(catalogo)];
  if (datosConocidos) bloques.push(datosConocidos);
  return bloques.join("\n\n---\n\n");
}
