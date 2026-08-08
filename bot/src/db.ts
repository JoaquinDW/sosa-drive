import pg from "pg";

const { Pool, types } = pg;

// Fechas como strings ISO crudos, igual que la capa de datos del panel
// (lib/db/pool.ts): date, timestamp y timestamptz.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v);
types.setTypeParser(1184, (v) => v);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL (la define docker-compose para el servicio bot).");
}

export const pool = new Pool({ connectionString });

export type ModoWa = "ia" | "humano";
export type RolWaMensaje = "cliente" | "ia" | "humano";
export type EstadoConexionWa = "desconectado" | "qr" | "conectando" | "conectado";

export interface WaConversacionFila {
  id: string;
  telefono: string;
  jid: string | null;
  nombre: string | null;
  modo: ModoWa;
  lead_id: string | null;
  ultimo_mensaje_en: string | null;
  creado_en: string;
}

export interface WaEstadoConexionFila {
  estado: EstadoConexionWa;
  qr_string: string | null;
  telefono: string | null;
  actualizado_en: string;
}

export interface MensajeHistorial {
  rol: RolWaMensaje;
  contenido: string;
}

// Mantener en sync con db/migrations/20260809000001_whatsapp.sql: la migración
// cubre los inits frescos de Postgres y este DDL cubre las bases ya existentes
// (no hay migration runner en el repo). Por eso todo es idempotente y se usa
// text + check en vez de enums.
const DDL = `
create table if not exists public.wa_conversaciones (
  id bigserial primary key,
  telefono text not null unique,
  nombre text,
  modo text not null default 'ia' check (modo in ('ia', 'humano')),
  ultimo_mensaje_en timestamptz,
  creado_en timestamptz not null default now()
);

-- jid completo del chat (@s.whatsapp.net o @lid). Baileys 7 direcciona los
-- chats 1:1 de las dos formas: hay que responder al mismo jid por el que llegó
-- el mensaje, reconstruirlo desde el teléfono abre otra conversación.
alter table public.wa_conversaciones add column if not exists jid text;

create table if not exists public.wa_mensajes (
  id bigserial primary key,
  conversacion_id bigint not null references public.wa_conversaciones (id) on delete cascade,
  rol text not null check (rol in ('cliente', 'ia', 'humano')),
  contenido text not null,
  creado_en timestamptz not null default now()
);

create index if not exists wa_mensajes_conversacion_idx
  on public.wa_mensajes (conversacion_id, creado_en);

create table if not exists public.wa_estado_conexion (
  id int primary key default 1 check (id = 1),
  estado text not null default 'desconectado'
    check (estado in ('desconectado', 'qr', 'conectando', 'conectado')),
  qr_string text,
  telefono text,
  actualizado_en timestamptz not null default now()
);

insert into public.wa_estado_conexion (id) values (1)
on conflict (id) do nothing;

-- Vínculo con el CRM: cada conversación tiene su lead (ver src/leads.ts).
alter table public.wa_conversaciones
  add column if not exists lead_id uuid references public.leads (id) on delete set null;

create index if not exists wa_conversaciones_lead_idx
  on public.wa_conversaciones (lead_id);

-- Backfill de las conversaciones anteriores al bot cualificador, para que la
-- ficha del panel no quede vacía esperando el próximo mensaje. Idempotente:
-- solo toca las filas que todavía no tienen lead.
insert into public.leads (nombre, telefono, fuente, estado, score, score_motivo, notas)
select coalesce(nullif(trim(c.nombre), ''), 'Sin nombre'),
       c.telefono,
       'whatsapp',
       'contactado',
       10, -- mismo piso que un lead nuevo; se recalcula al próximo mensaje
       'Escribió por WhatsApp. El bot todavía no cualificó esta charla.',
       'Lead creado automáticamente desde una conversación de WhatsApp anterior al bot cualificador.'
from public.wa_conversaciones c
where c.lead_id is null
  and not exists (select 1 from public.leads l where l.telefono = c.telefono);

update public.wa_conversaciones c
set lead_id = (
  select l.id from public.leads l
  where l.telefono = c.telefono
  order by l.creado_en desc
  limit 1
)
where c.lead_id is null;
`;

/** Crea las tablas wa_* si no existen. Se corre en cada arranque del bot. */
export async function ensureSchema(): Promise<void> {
  await pool.query(DDL);
  console.log("[bot] schema wa_* verificado");
}

export async function getEstadoConexion(): Promise<WaEstadoConexionFila> {
  const res = await pool.query<WaEstadoConexionFila>(
    "select estado, qr_string, telefono, actualizado_en from public.wa_estado_conexion where id = 1",
  );
  return res.rows[0];
}

/**
 * Actualiza el estado de conexión preservando los campos que no se pasan:
 * `undefined` = dejar como está, `null` = borrar. Esto evita perder el
 * qr_string en transiciones como 'qr' → 'conectando'.
 */
export async function setEstadoConexion(patch: {
  estado?: EstadoConexionWa;
  qr_string?: string | null;
  telefono?: string | null;
}): Promise<void> {
  const sets: string[] = ["actualizado_en = now()"];
  const valores: unknown[] = [];
  if (patch.estado !== undefined) {
    valores.push(patch.estado);
    sets.push(`estado = $${valores.length}`);
  }
  if (patch.qr_string !== undefined) {
    valores.push(patch.qr_string);
    sets.push(`qr_string = $${valores.length}`);
  }
  if (patch.telefono !== undefined) {
    valores.push(patch.telefono);
    sets.push(`telefono = $${valores.length}`);
  }
  await pool.query(`update public.wa_estado_conexion set ${sets.join(", ")} where id = 1`, valores);
}

export async function getOrCreateConversacion(
  telefono: string,
  jid: string,
  nombre?: string,
): Promise<WaConversacionFila> {
  const res = await pool.query<WaConversacionFila>(
    `insert into public.wa_conversaciones (telefono, jid, nombre) values ($1, $2, $3)
     on conflict (telefono) do update
       set nombre = coalesce(excluded.nombre, wa_conversaciones.nombre),
           jid = coalesce(excluded.jid, wa_conversaciones.jid)
     returning *`,
    [telefono, jid, nombre ?? null],
  );
  return res.rows[0];
}

/** jid del chat para responder desde el panel. Null si la fila es vieja. */
export async function getJidPorTelefono(telefono: string): Promise<string | null> {
  const res = await pool.query<{ jid: string | null }>(
    "select jid from public.wa_conversaciones where telefono = $1",
    [telefono],
  );
  return res.rows[0]?.jid ?? null;
}

/** Re-lectura fresca del modo: el toggle del panel pudo cambiar entre medio. */
export async function getModo(conversacionId: string): Promise<ModoWa | null> {
  const res = await pool.query<{ modo: ModoWa }>(
    "select modo from public.wa_conversaciones where id = $1",
    [conversacionId],
  );
  return res.rows[0]?.modo ?? null;
}

export async function insertarMensaje(
  conversacionId: string,
  rol: RolWaMensaje,
  contenido: string,
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(
      "insert into public.wa_mensajes (conversacion_id, rol, contenido) values ($1, $2, $3)",
      [conversacionId, rol, contenido],
    );
    await cliente.query(
      "update public.wa_conversaciones set ultimo_mensaje_en = now() where id = $1",
      [conversacionId],
    );
    await cliente.query("commit");
  } catch (err) {
    await cliente.query("rollback");
    throw err;
  } finally {
    cliente.release();
  }
}

/** Últimos N mensajes en orden cronológico ascendente (DESC + reverse). */
export async function getHistorialReciente(
  conversacionId: string,
  limite = 20,
): Promise<MensajeHistorial[]> {
  const res = await pool.query<MensajeHistorial>(
    `select rol, contenido from public.wa_mensajes
     where conversacion_id = $1
     order by creado_en desc, id desc
     limit $2`,
    [conversacionId, limite],
  );
  return res.rows.reverse();
}

export async function cerrarPool(): Promise<void> {
  await pool.end();
}
