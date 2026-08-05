-- Sosa Drive — Esquema inicial (Fase 1: MVP Comercial)
-- Convención: tablas y columnas en español, snake_case.
--
-- Stack self-hosted: PostgreSQL puro (sin RLS ni schema auth de Supabase).
-- La autenticación vive en la app (password hasheado en perfiles + sesión en Redis);
-- la autorización se aplica en la capa de datos.

create extension if not exists pgcrypto;

-- ===========================================================
-- Enums
-- ===========================================================
create type rol_usuario as enum ('gerente', 'vendedor');

create type estado_lead as enum (
  'nuevo', 'contactado', 'calificado', 'visita', 'negociacion', 'vendido', 'perdido'
);

create type fuente_lead as enum (
  'whatsapp', 'instagram', 'facebook', 'web', 'google', 'mercadolibre', 'referido', 'llamada'
);

create type forma_pago as enum ('contado', 'financiado', 'permuta', 'mixto');

create type tipo_evento_lead as enum (
  'ingreso', 'asignacion', 'mensaje', 'llamada', 'ia', 'visita', 'nota', 'estado', 'cotizacion'
);

create type autor_mensaje as enum ('cliente', 'vendedor', 'ia');

create type estado_unidad as enum ('disponible', 'reservada', 'vendida', 'en_transito');

create type prioridad_tarea as enum ('alta', 'media', 'baja');

create type tipo_evento_agenda as enum (
  'visita', 'test_drive', 'llamada', 'entrega', 'service', 'recordatorio'
);

create type estado_evento_agenda as enum ('pendiente', 'confirmado', 'completado', 'cancelado');

create type modo_distribucion as enum ('round_robin', 'prioridad', 'especialista', 'compulsa');

-- ===========================================================
-- Perfiles / usuarios (autenticación propia)
-- ===========================================================
create table public.perfiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  nombre text not null,
  rol rol_usuario not null default 'vendedor',
  avatar_url text,
  nivel int not null default 1,
  xp int not null default 0,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Catálogo de motos
-- ===========================================================
create table public.motos (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  anio int not null,
  precio numeric(14, 2) not null,
  precio_financiado numeric(14, 2),
  descripcion text,
  motor text,
  cilindrada int,
  consumo text,
  velocidad_maxima int,
  garantia text,
  colores text[] not null default '{}',
  imagen_url text,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Stock por unidad
-- ===========================================================
create table public.unidades_stock (
  id uuid primary key default gen_random_uuid(),
  moto_id uuid not null references public.motos (id) on delete cascade,
  numero_motor text not null,
  numero_cuadro text not null,
  sucursal text not null,
  color text not null,
  estado estado_unidad not null default 'disponible',
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Leads (clientes potenciales)
-- ===========================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dni text,
  telefono text not null,
  email text,
  ciudad text,
  fuente fuente_lead not null,
  moto_interes_id uuid references public.motos (id) on delete set null,
  moto_alternativa_id uuid references public.motos (id) on delete set null,
  presupuesto numeric(14, 2),
  forma_pago forma_pago not null default 'contado',
  financiacion boolean not null default false,
  permuta text,
  estado estado_lead not null default 'nuevo',
  score int not null default 0 check (score between 0 and 100),
  score_motivo text,
  vendedor_id uuid references public.perfiles (id) on delete set null,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  ultimo_contacto_en timestamptz
);

create index leads_estado_idx on public.leads (estado);
create index leads_vendedor_idx on public.leads (vendedor_id);
create index leads_creado_idx on public.leads (creado_en desc);

-- ===========================================================
-- Timeline de eventos por lead
-- ===========================================================
create table public.eventos_lead (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  tipo tipo_evento_lead not null,
  descripcion text not null,
  actor text not null default 'Sistema',
  creado_en timestamptz not null default now()
);

create index eventos_lead_lead_idx on public.eventos_lead (lead_id, creado_en desc);

-- ===========================================================
-- Inbox omnicanal
-- ===========================================================
create table public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  canal fuente_lead not null,
  no_leidos int not null default 0,
  ultimo_mensaje text,
  ultimo_mensaje_en timestamptz,
  asignado_a uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index conversaciones_ultimo_idx on public.conversaciones (ultimo_mensaje_en desc);

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  autor autor_mensaje not null,
  contenido text not null,
  nota_privada boolean not null default false,
  creado_en timestamptz not null default now()
);

create index mensajes_conversacion_idx on public.mensajes (conversacion_id, creado_en);

-- ===========================================================
-- Tareas
-- ===========================================================
create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  lead_id uuid references public.leads (id) on delete set null,
  vendedor_id uuid not null references public.perfiles (id) on delete cascade,
  vence_en timestamptz not null,
  completada_en timestamptz,
  prioridad prioridad_tarea not null default 'media',
  creado_en timestamptz not null default now()
);

create index tareas_vendedor_idx on public.tareas (vendedor_id, vence_en);

-- ===========================================================
-- Agenda
-- ===========================================================
create table public.eventos_agenda (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_evento_agenda not null,
  titulo text not null,
  lead_id uuid references public.leads (id) on delete set null,
  vendedor_id uuid not null references public.perfiles (id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  notas text,
  estado estado_evento_agenda not null default 'pendiente',
  creado_en timestamptz not null default now()
);

create index eventos_agenda_inicio_idx on public.eventos_agenda (inicio);

-- ===========================================================
-- Configuración (clave/valor)
-- ===========================================================
create table public.configuracion (
  clave text primary key,
  valor jsonb not null,
  actualizado_en timestamptz not null default now()
);

insert into public.configuracion (clave, valor)
values ('distribucion_leads', '{"modo": "round_robin", "segundos_compulsa": 30}');

-- ===========================================================
-- Trigger: mantener actualizado_en en leads
-- ===========================================================
create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger leads_actualizado
  before update on public.leads
  for each row execute function public.marcar_actualizado();

-- ===========================================================
-- Vista: stock disponible por moto
-- ===========================================================
create view public.stock_por_moto as
select
  m.id as moto_id,
  count(u.id) filter (where u.estado = 'disponible') as disponibles,
  count(u.id) filter (where u.estado = 'reservada') as reservadas,
  count(u.id) filter (where u.estado = 'en_transito') as en_transito
from public.motos m
left join public.unidades_stock u on u.moto_id = m.id
group by m.id;
