import { getCliente } from "./openai.js";
import type { MensajeHistorial } from "./db.js";

/**
 * Extracción de los datos del interesado a partir de la conversación.
 *
 * Va como segunda pasada al LLM, separada de la que genera la respuesta, en
 * vez de como tool call dentro de la charla. Dos motivos:
 *
 * 1. El bot conversador no puede "olvidarse" de registrar el dato: la pasada
 *    de extracción corre siempre, con o sin respuesta (también en modo humano).
 * 2. Corre sobre TODA la conversación reciente, no sobre el último mensaje, así
 *    que es idempotente: lo que el cliente dijo hace cinco mensajes sigue
 *    apareciendo en cada corrida. La capa de leads se apoya en eso.
 *
 * Regla dura del prompt: solo lo que el cliente dijo explícitamente. Un dato
 * inventado acá termina en la ficha que abre el vendedor.
 */

export interface DatosExtraidos {
  nombre: string | null;
  ciudad: string | null;
  modelo_interes: string | null;
  forma_pago: "contado" | "financiado" | "permuta" | "mixto" | null;
  presupuesto: number | null;
  moto_permuta: string | null;
  quiere_asesor: boolean;
  resumen: string;
}

const INSTRUCCIONES = `
Extraés datos de una conversación de WhatsApp entre un cliente y una concesionaria
de motos de Corrientes, Argentina. No conversás: solo devolvés datos.

REGLA PRINCIPAL: solo cuenta lo que dijo el CLIENTE. Los mensajes del asistente
son contexto, nunca la fuente de un dato. El asistente nombra modelos, dice
precios "de contado" y ofrece asesores todo el tiempo: nada de eso es un dato
del cliente.

Si un dato no aparece, va null. null es la respuesta correcta y esperada: es
mucho peor inventar un dato que dejarlo vacío. Ante la duda, null.

- nombre: el nombre que el cliente dio de sí mismo. Que el asistente lo salude
  por un nombre no cuenta, y que se lo pregunte tampoco. Si el cliente nunca lo
  escribió, null.
- ciudad: ciudad, barrio o zona de donde es el cliente. "Del centro" o "de acá"
  solos no alcanzan: null salvo que se entienda de qué ciudad habla.
- modelo_interes: el modelo de moto que el CLIENTE preguntó o busca, tal cual lo
  nombró ("honda wave", "wave 110", "una 150 para trabajar"). Si el modelo lo
  trajo el asistente y el cliente no lo pidió ni lo confirmó, null. Si el cliente
  preguntó por varios, el último.
- forma_pago: cómo dijo el CLIENTE que va a pagar. "contado" si paga todo junto,
  "financiado" si pidió cuotas o financiación, "permuta" si entrega su moto,
  "mixto" si combina permuta con plata.
  OJO: el asistente dice "$X de contado" cada vez que pasa un precio. Eso NO es
  el cliente eligiendo contado. Si el cliente no dijo cómo paga, null.
- presupuesto: monto en pesos argentinos que el cliente dijo que puede gastar,
  como número sin símbolos ni puntos. El precio de una moto que le pasaron NO es
  su presupuesto: null.
- moto_permuta: la moto usada que el cliente ofreció entregar, con año si lo dijo.
- quiere_asesor: true SOLO si el cliente pidió algo concreto: hablar con una
  persona o un vendedor, reservar o señar una unidad, ir al local a comprar, o
  preguntó por cuotas, financiación o requisitos.
  Preguntar un precio, un modelo o si hay stock NO es querer un asesor: va false.
  "Quiere más información" no alcanza. Por defecto, false.
- resumen: una oración en español rioplatense para el vendedor, contando qué
  busca y en qué quedó la charla. Máximo 200 caracteres.
`.trim();

const ESQUEMA = {
  type: "object" as const,
  properties: {
    nombre: { type: ["string", "null"] },
    ciudad: { type: ["string", "null"] },
    modelo_interes: { type: ["string", "null"] },
    forma_pago: {
      type: ["string", "null"],
      enum: ["contado", "financiado", "permuta", "mixto", null],
    },
    presupuesto: { type: ["number", "null"] },
    moto_permuta: { type: ["string", "null"] },
    quiere_asesor: { type: "boolean" },
    resumen: { type: "string" },
  },
  // Structured outputs exige listar todas las propiedades como required; los
  // campos "opcionales" se modelan con el tipo nullable de arriba.
  required: [
    "nombre",
    "ciudad",
    "modelo_interes",
    "forma_pago",
    "presupuesto",
    "moto_permuta",
    "quiere_asesor",
    "resumen",
  ],
  additionalProperties: false,
};

/** Etiqueta legible para el LLM: quién dijo cada cosa. */
function transcribir(historial: MensajeHistorial[]): string {
  return historial
    .map((m) => `${m.rol === "cliente" ? "Cliente" : "Asistente"}: ${m.contenido}`)
    .join("\n");
}

/**
 * Devuelve los datos detectados, o `null` si la extracción falló. Nunca tira:
 * que no se pueda cualificar un lead no puede romper la atención al cliente.
 */
export async function extraerDatos(
  historial: MensajeHistorial[],
): Promise<DatosExtraidos | null> {
  if (historial.length === 0) return null;

  try {
    const res = await getCliente().chat.completions.create({
      model: process.env.OPENAI_MODEL_EXTRACCION ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: INSTRUCCIONES },
        { role: "user", content: transcribir(historial) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "datos_lead", strict: true, schema: ESQUEMA },
      },
    });

    const crudo = res.choices[0]?.message?.content;
    if (!crudo) {
      console.warn("[bot] la extracción devolvió vacío");
      return null;
    }
    return normalizar(JSON.parse(crudo) as DatosExtraidos);
  } catch (err) {
    console.error("[bot] falló la extracción de datos del lead:", err);
    return null;
  }
}

/**
 * Limpia lo que el schema no puede garantizar: strings vacíos o basura que el
 * modelo a veces manda en vez de null ("no dijo", "n/a", "-").
 */
function normalizar(datos: DatosExtraidos): DatosExtraidos {
  const NO_DATO = new Set(["", "-", "n/a", "na", "null", "no dijo", "no especifica", "desconocido"]);

  const texto = (valor: string | null): string | null => {
    if (typeof valor !== "string") return null;
    const limpio = valor.trim();
    return NO_DATO.has(limpio.toLowerCase()) ? null : limpio;
  };

  return {
    nombre: texto(datos.nombre),
    ciudad: texto(datos.ciudad),
    modelo_interes: texto(datos.modelo_interes),
    forma_pago: datos.forma_pago ?? null,
    presupuesto: typeof datos.presupuesto === "number" ? datos.presupuesto : null,
    moto_permuta: texto(datos.moto_permuta),
    quiere_asesor: datos.quiere_asesor === true,
    resumen: texto(datos.resumen) ?? "",
  };
}
