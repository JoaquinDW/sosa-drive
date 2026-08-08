-- Módulo WhatsApp (bot de Baileys + panel /whatsapp).
--
-- Mantener en sync con bot/src/db.ts (ensureSchema): el bot ejecuta este mismo
-- DDL idempotente en cada arranque, por eso acá se usa text + check en vez de
-- los enums habituales del esquema (create type no tiene "if not exists").

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

-- Fila única (id = 1) con el estado de la conexión de WhatsApp: el bot la
-- escribe y el panel la lee (polling).
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
