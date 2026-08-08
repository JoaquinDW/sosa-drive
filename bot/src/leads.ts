import { pool } from "./db.js";
import type { DatosExtraidos } from "./extraccion.js";

/**
 * El bot como cualificador: cada conversación de WhatsApp tiene su lead en el
 * CRM, y los datos que el cliente va soltando se van escribiendo ahí.
 *
 * Reglas que se respetan acá (project.md §4):
 *
 * - Un lead por teléfono. Si ya existía (lo cargó un vendedor a mano, o es un
 *   cliente que vuelve), se engancha a ese en vez de duplicar.
 * - Los datos se *completan*, nunca se pisan con vacío: si la extracción no
 *   detectó la ciudad en el último mensaje, la ciudad que ya estaba se queda.
 * - El estado solo avanza mientras nadie del equipo lo haya tocado: si un
 *   vendedor lo movió a `visita`/`negociacion`/`vendido`/`perdido`, el bot no
 *   lo pisa.
 */

export interface LeadConversacion {
  id: string;
  nombre: string;
  ciudad: string | null;
  estado: string;
  score: number;
  forma_pago: string;
  presupuesto: string | null;
  permuta: string | null;
  moto_interes_id: string | null;
  /** "Honda Wave 110 S", armado en la query. Null si no hay moto de interés. */
  moto_interes: string | null;
}

const SELECT_LEAD = `
  select l.id, l.nombre, l.ciudad, l.estado::text as estado, l.score,
         l.forma_pago::text as forma_pago, l.presupuesto, l.permuta,
         l.moto_interes_id,
         (select m.marca || ' ' || m.modelo from public.motos m
          where m.id = l.moto_interes_id) as moto_interes
  from public.leads l
`;

/**
 * Devuelve el lead de la conversación, creándolo si hace falta y dejándolo
 * vinculado en `wa_conversaciones.lead_id`.
 */
export async function getOrCreateLead(
  conversacionId: string,
  telefono: string,
  nombreWa: string | null,
): Promise<LeadConversacion> {
  const existente = await pool.query<LeadConversacion>(
    `${SELECT_LEAD} join public.wa_conversaciones c on c.lead_id = l.id where c.id = $1`,
    [conversacionId],
  );
  const lead = existente.rows[0];
  if (lead) {
    // El nombre de WhatsApp puede aparecer después del primer mensaje (el
    // contacto lo tenía oculto, o el lead lo creó el backfill sin él). En
    // cuanto lo tenemos, se adopta: es un dato que ya no hay que preguntar.
    const nombreNuevo = nombreWa?.trim();
    if (nombreNuevo && lead.nombre === "Sin nombre") {
      await pool.query(
        "update public.leads set nombre = $1, actualizado_en = now() where id = $2",
        [nombreNuevo.slice(0, 120), lead.id],
      );
      lead.nombre = nombreNuevo;
    }
    return lead;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("begin");

    // Cliente que vuelve, o lead cargado a mano por un vendedor: se reusa.
    const previo = await cliente.query<{ id: string }>(
      "select id from public.leads where telefono = $1 order by creado_en desc limit 1",
      [telefono],
    );

    let leadId = previo.rows[0]?.id;
    if (leadId) {
      console.log(`[bot] lead existente ${leadId} reusado para ${telefono}`);
    } else {
      const nombre = nombreWa?.trim() || "Sin nombre";
      const creado = await cliente.query<{ id: string }>(
        `insert into public.leads (nombre, telefono, fuente, estado, score, score_motivo)
         values ($1, $2, 'whatsapp', 'nuevo', 10, 'Escribió por WhatsApp. Todavía sin datos.')
         returning id`,
        [nombre, telefono],
      );
      leadId = creado.rows[0].id;
      await cliente.query(
        `insert into public.eventos_lead (lead_id, tipo, descripcion, actor)
         values ($1, 'ingreso', $2, 'IA')`,
        [leadId, `Escribió por WhatsApp desde +${telefono}.`],
      );
      console.log(`[bot] lead ${leadId} creado para ${telefono}`);
    }

    await cliente.query("update public.wa_conversaciones set lead_id = $1 where id = $2", [
      leadId,
      conversacionId,
    ]);
    await cliente.query("commit");
  } catch (err) {
    await cliente.query("rollback");
    throw err;
  } finally {
    cliente.release();
  }

  const fila = await pool.query<LeadConversacion>(
    `${SELECT_LEAD} join public.wa_conversaciones c on c.lead_id = l.id where c.id = $1`,
    [conversacionId],
  );
  return fila.rows[0];
}

// ---------------------------------------------------------------------------
// Matcheo de modelo contra el catálogo
// ---------------------------------------------------------------------------

interface FilaMoto {
  id: string;
  marca: string;
  modelo: string;
}

const TTL_MOTOS_MS = 60_000;
let cacheMotos: { motos: FilaMoto[]; expira: number } | null = null;

async function motosActivas(): Promise<FilaMoto[]> {
  if (cacheMotos && cacheMotos.expira > Date.now()) return cacheMotos.motos;
  const res = await pool.query<FilaMoto>(
    "select id, marca, modelo from public.motos where activa = true",
  );
  cacheMotos = { motos: res.rows, expira: Date.now() + TTL_MOTOS_MS };
  return res.rows;
}

/** Minúsculas, sin acentos y sin puntuación, para comparar texto libre. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // marcas combinantes que dejó el NFD (tildes)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matchea el texto libre del cliente ("una honda wave", "wave 110") contra el
 * catálogo: cuenta cuántos tokens de "marca modelo" aparecen en lo que dijo.
 *
 * Devuelve null si nada matchea con confianza: es preferible dejar la moto de
 * interés vacía a mandarle al vendedor el modelo equivocado.
 */
export async function matchearMoto(texto: string): Promise<string | null> {
  const consulta = normalizar(texto);
  if (!consulta) return null;

  let mejor: { id: string; puntaje: number } | null = null;
  for (const moto of await motosActivas()) {
    const tokens = normalizar(`${moto.marca} ${moto.modelo}`)
      .split(" ")
      .filter((t) => t.length > 1);
    if (tokens.length === 0) continue;

    const aciertos = tokens.filter((t) => consulta.includes(t)).length;
    if (aciertos === 0) continue;

    // Proporción de tokens del modelo presentes en lo que dijo el cliente, con
    // un desempate por especificidad (gana "Wave 110 S" sobre "Wave" si el
    // cliente nombró las dos cosas).
    const puntaje = aciertos / tokens.length + aciertos * 0.01;
    if (!mejor || puntaje > mejor.puntaje) mejor = { id: moto.id, puntaje };
  }

  // Umbral: hace falta al menos la mitad de los tokens del modelo.
  return mejor && mejor.puntaje >= 0.5 ? mejor.id : null;
}

// ---------------------------------------------------------------------------
// Score y estado
// ---------------------------------------------------------------------------

const FORMAS_PAGO_VALIDAS = ["contado", "financiado", "permuta", "mixto"];

/** Estados que el bot puede tocar: más allá de `calificado` manda el equipo. */
const ESTADOS_DEL_BOT = ["nuevo", "contactado", "calificado"];

interface Calificacion {
  score: number;
  motivo: string;
}

/**
 * Score determinístico (0..100) según qué datos de project.md §4 ya tenemos.
 * No lo decide el LLM a ojo: así dos leads con los mismos datos puntúan igual
 * y el vendedor puede confiar en el orden.
 */
function calificar(lead: LeadDeseado, quiereAsesor: boolean): Calificacion {
  const tiene: string[] = [];
  const faltan: string[] = [];
  let score = 10;

  const conNombre = lead.nombre !== "Sin nombre";
  if (conNombre) {
    score += 20;
    tiene.push("nombre");
  } else faltan.push("nombre");

  if (lead.moto_interes_id) {
    score += 30;
    tiene.push("modelo de interés");
  } else faltan.push("modelo");

  if (lead.forma_pago_declarada) {
    score += 15;
    tiene.push("forma de pago");
  } else faltan.push("forma de pago");

  if (lead.ciudad) {
    score += 10;
    tiene.push("ciudad");
  } else faltan.push("ciudad");

  if (quiereAsesor) {
    score += 15;
    tiene.push("pidió avanzar con un asesor");
  }

  const partes: string[] = [];
  if (tiene.length > 0) partes.push(`El bot ya tiene ${tiene.join(", ")}.`);
  if (faltan.length > 0) partes.push(`Falta: ${faltan.join(", ")}.`);

  return { score: Math.min(score, 100), motivo: partes.join(" ") };
}

/** El lead como va a quedar después de aplicar los cambios: lo que se puntúa. */
interface LeadDeseado {
  nombre: string;
  ciudad: string | null;
  moto_interes_id: string | null;
  /** El cliente dijo cómo va a pagar (forma_pago tiene default 'contado'). */
  forma_pago_declarada: boolean;
}

// ---------------------------------------------------------------------------
// Actualización
// ---------------------------------------------------------------------------

/**
 * Cómo se nombra cada columna en el timeline del lead. `financiacion` no está
 * a propósito: se deriva de `forma_pago` y contarla aparte sería redundante.
 */
const ETIQUETA_CAMPO: Record<string, string> = {
  nombre: "nombre",
  ciudad: "ciudad",
  moto_interes_id: "moto de interés",
  forma_pago: "forma de pago",
  presupuesto: "presupuesto",
  permuta: "permuta",
};

/**
 * Aplica los datos extraídos sobre el lead: completa los campos vacíos,
 * recalcula el score, avanza el estado y deja un evento en el timeline con lo
 * que cambió. Si no cambió nada, solo marca el último contacto.
 */
export async function actualizarLeadDesdeExtraccion(
  lead: LeadConversacion,
  datos: DatosExtraidos,
  nombreWa: string | null = null,
): Promise<void> {
  const cambios: Record<string, unknown> = {};

  // El nombre que la persona escribe cuando se lo preguntan ("Melina") le gana
  // al que trae WhatsApp ("Meli Prueba"): ese es un apodo de perfil, no cómo
  // quiere que la llamen. Se pisa mientras el nombre siga siendo el provisorio
  // y el lead sea del bot; lo que corrigió un vendedor no se toca.
  const nombreProvisorio =
    !lead.nombre ||
    lead.nombre === "Sin nombre" ||
    (!!nombreWa && lead.nombre.trim() === nombreWa.trim());
  if (
    datos.nombre &&
    datos.nombre !== lead.nombre &&
    nombreProvisorio &&
    ESTADOS_DEL_BOT.includes(lead.estado)
  ) {
    cambios.nombre = datos.nombre.slice(0, 120);
  }
  if (datos.ciudad && !lead.ciudad) cambios.ciudad = datos.ciudad.slice(0, 120);

  if (datos.modelo_interes && !lead.moto_interes_id) {
    const motoId = await matchearMoto(datos.modelo_interes);
    if (motoId) cambios.moto_interes_id = motoId;
  }

  // `forma_pago` no se puede leer de la fila para saber si el cliente ya la
  // dijo: la columna tiene default 'contado', así que un lead recién creado se
  // ve igual que uno que dijo "de contado". La señal es la extracción, que
  // corre sobre TODA la conversación: si en algún momento lo dijo, viene en
  // cada corrida. Solo se escribe mientras el lead sea del bot, para no pisar
  // lo que haya corregido un vendedor en el panel.
  const formaPagoDeclarada =
    !!datos.forma_pago && FORMAS_PAGO_VALIDAS.includes(datos.forma_pago);
  if (
    formaPagoDeclarada &&
    datos.forma_pago !== lead.forma_pago &&
    ESTADOS_DEL_BOT.includes(lead.estado)
  ) {
    cambios.forma_pago = datos.forma_pago;
    cambios.financiacion = datos.forma_pago === "financiado";
  }

  if (datos.presupuesto && datos.presupuesto > 0 && !lead.presupuesto) {
    cambios.presupuesto = datos.presupuesto;
  }
  if (datos.moto_permuta && !lead.permuta) {
    cambios.permuta = datos.moto_permuta.slice(0, 200);
  }

  const deseado: LeadDeseado = {
    nombre: (cambios.nombre as string) ?? lead.nombre,
    ciudad: (cambios.ciudad as string) ?? lead.ciudad,
    moto_interes_id: (cambios.moto_interes_id as string) ?? lead.moto_interes_id,
    forma_pago_declarada: formaPagoDeclarada,
  };

  const { score, motivo } = calificar(deseado, datos.quiere_asesor);
  const sets: string[] = ["actualizado_en = now()", "ultimo_contacto_en = now()"];
  const valores: unknown[] = [];

  for (const [columna, valor] of Object.entries(cambios)) {
    valores.push(valor);
    sets.push(`${columna} = $${valores.length}`);
  }

  if (score !== lead.score) {
    valores.push(score);
    sets.push(`score = $${valores.length}`);
    valores.push(motivo);
    sets.push(`score_motivo = $${valores.length}`);
  }

  // El estado solo avanza; nunca retrocede ni pisa lo que movió el equipo.
  const califica = deseado.nombre !== "Sin nombre" && !!deseado.moto_interes_id;
  const nuevoEstado = califica || datos.quiere_asesor ? "calificado" : "contactado";
  if (
    ESTADOS_DEL_BOT.includes(lead.estado) &&
    ESTADOS_DEL_BOT.indexOf(nuevoEstado) > ESTADOS_DEL_BOT.indexOf(lead.estado)
  ) {
    valores.push(nuevoEstado);
    sets.push(`estado = $${valores.length}`);
  }

  valores.push(lead.id);
  await pool.query(
    `update public.leads set ${sets.join(", ")} where id = $${valores.length}`,
    valores,
  );

  const camposCambiados = Object.keys(cambios)
    .filter((c) => c in ETIQUETA_CAMPO)
    .map((c) => ETIQUETA_CAMPO[c]);
  if (camposCambiados.length > 0) {
    await registrarEvento(
      lead.id,
      "ia",
      `El bot completó ${camposCambiados.join(", ")} desde la charla de WhatsApp.`,
    );
    console.log(`[bot] lead ${lead.id} actualizado: ${camposCambiados.join(", ")}`);
  }

  if (datos.quiere_asesor && lead.estado !== "calificado") {
    await registrarEvento(
      lead.id,
      "ia",
      `Pide hablar con un asesor. ${datos.resumen}`.trim(),
    );
  }
}

/** Un evento en el timeline del lead (lo muestra /leads/[id]). */
export async function registrarEvento(
  leadId: string,
  tipo: "ingreso" | "mensaje" | "ia" | "nota" | "estado",
  descripcion: string,
  actor = "IA",
): Promise<void> {
  await pool.query(
    "insert into public.eventos_lead (lead_id, tipo, descripcion, actor) values ($1, $2, $3, $4)",
    [leadId, tipo, descripcion.slice(0, 500), actor],
  );
}

/**
 * Bloque para el system prompt con lo que ya sabemos del cliente, para que el
 * bot no vuelva a preguntar un dato que ya está cargado (project.md §4).
 *
 * El nombre casi siempre está desde el primer mensaje: lo trae WhatsApp en el
 * perfil del contacto. Preguntar "¿cómo te llamás?" a alguien cuyo nombre ya
 * tenemos en pantalla es exactamente lo que no queremos.
 *
 * Null si el lead está vacío: no ensucia el prompt con "no sé nada".
 */
export function bloqueDatosConocidos(lead: LeadConversacion): string | null {
  const lineas: string[] = [];
  if (lead.nombre && lead.nombre !== "Sin nombre") lineas.push(`- Nombre: ${lead.nombre}`);
  if (lead.moto_interes) lineas.push(`- Modelo que le interesa: ${lead.moto_interes}`);
  if (lead.forma_pago !== "contado") lineas.push(`- Forma de pago: ${lead.forma_pago}`);
  if (lead.ciudad) lineas.push(`- Ciudad / zona: ${lead.ciudad}`);
  if (lead.permuta) lineas.push(`- Moto que entrega en permuta: ${lead.permuta}`);
  if (lineas.length === 0) return null;

  return [
    "## Datos que YA TENÉS de esta persona",
    "",
    "Estos datos ya están cargados en el sistema. Esta sección le gana a",
    "cualquier otra indicación de arriba sobre qué datos juntar:",
    "",
    "- **NO los preguntes. Ninguno. Nunca.** Ya los sabés. Preguntar algo que",
    "  figura acá es el peor error que podés cometer: queda como que no le",
    "  prestaste atención.",
    "- Usalos con naturalidad. Si tenés el nombre, saludala por su nombre desde",
    "  el primer mensaje, sin anunciar que lo sabías.",
    "- Preguntá SOLO por lo que falta, de a uno.",
    "- Si la persona te corrige un dato, vale el nuevo y seguís con ese.",
    "",
    ...lineas,
    "",
    "El nombre sale del perfil de WhatsApp. Si no parece un nombre de persona",
    "(un negocio, un apodo raro, puros emojis), simplemente no lo uses para",
    "saludar — pero tampoco lo preguntes.",
  ].join("\n");
}
