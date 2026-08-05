-- Sosa Drive — Módulo de Operaciones (PRD-modelo-base.md)
-- Inventario por unidad, kardex, compras, taller, créditos, gastos, caja,
-- clientes y auditoría. Convención: tablas y columnas en español, snake_case.
--
-- Reglas del PRD aplicadas acá:
--  * Cada moto es única (dominio y número de cuadro únicos).
--  * El kardex (movimientos_inventario) y la auditoría son inmutables:
--    no hay políticas de update/delete, y triggers los bloquean.
--  * Nunca se elimina una unidad: se da de baja por estado.
--  * Toda venta descuenta stock y todo movimiento genera auditoría (triggers).

-- ===========================================================
-- Enums
-- ===========================================================
create type condicion_unidad as enum ('0km', 'usada');

create type estado_unidad_inventario as enum (
  'disponible', 'reservada', 'vendida', 'en_taller', 'en_reparacion',
  'en_transito', 'en_garantia', 'baja'
);

create type ubicacion_unidad as enum (
  'salon', 'deposito', 'taller', 'sucursal', 'proveedor', 'cliente'
);

create type tipo_movimiento_inventario as enum (
  'compra', 'ingreso', 'transferencia', 'venta', 'reserva',
  'ingreso_taller', 'salida_taller', 'permuta', 'baja', 'correccion'
);

create type metodo_venta as enum (
  'contado', 'credito_casa', 'credito_directo', 'credito_argentino', 'santander'
);

create type canal_venta as enum (
  'publicidad', 'marketplace', 'cliente_propio', 'instagram'
);

create type estado_credito as enum ('al_dia', 'en_mora', 'cancelado', 'refinanciado');

create type estado_cuota as enum (
  'pendiente', 'pagada', 'vencida', 'refinanciada', 'cancelada'
);

create type estado_orden_taller as enum (
  'pendiente', 'en_reparacion', 'esperando_repuestos',
  'finalizada', 'entregada', 'cancelada'
);

create type tipo_gasto_taller as enum ('repuestos', 'insumos', 'horas', 'servicio_externo');

create type categoria_gasto as enum (
  'sueldos', 'combustible', 'servicios', 'alquiler', 'impuestos',
  'taller', 'repuestos', 'marketing', 'otros'
);

create type tipo_movimiento_caja as enum ('ingreso', 'egreso');

create type categoria_caja as enum (
  'venta', 'cobro_cuota', 'cobro_financiera', 'servicio_taller',
  'compra', 'gasto', 'sueldos', 'otro'
);

-- ===========================================================
-- Compras a proveedores
-- ===========================================================
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  factura text not null,
  fecha date not null,
  costo_total numeric(14, 2) not null default 0,
  forma_pago text not null,
  observaciones text,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Unidades del inventario (cada moto es única)
-- ===========================================================
create table public.unidades_inventario (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  cilindrada int,
  anio int,
  dominio text unique,
  numero_motor text,
  numero_cuadro text unique,
  color text not null default '',
  condicion condicion_unidad not null default 'usada',
  estado estado_unidad_inventario not null default 'disponible',
  ubicacion ubicacion_unidad not null default 'salon',
  precio_compra numeric(14, 2),
  precio_venta numeric(14, 2),
  fecha_ingreso date not null default current_date,
  fecha_venta date,
  observaciones text,
  compra_id uuid references public.compras (id),
  creado_en timestamptz not null default now()
);

-- Una unidad nunca se elimina: se da de baja por estado.

-- ===========================================================
-- Movimientos de inventario (kardex, inmutable)
-- ===========================================================
create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidades_inventario (id),
  tipo tipo_movimiento_inventario not null,
  origen text,
  destino text,
  motivo text not null,
  usuario text not null,
  observaciones text,
  fecha timestamptz not null default now()
);

create index movimientos_inventario_unidad_idx
  on public.movimientos_inventario (unidad_id, fecha desc);

-- El historial nunca se modifica: sin update ni delete (bloqueado por trigger).

create or replace function public.bloquear_modificacion()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registro inmutable: % no admite % (PRD: el historial nunca se modifica)',
    tg_table_name, tg_op;
end;
$$;

create trigger movimientos_inventario_inmutables
  before update or delete on public.movimientos_inventario
  for each row execute function public.bloquear_modificacion();

-- ===========================================================
-- Clientes de operaciones (ficha única)
-- ===========================================================
create table public.clientes_operaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  dni text,
  observaciones text,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Ventas
-- ===========================================================
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid references public.unidades_inventario (id),
  descripcion text not null,
  cliente_id uuid references public.clientes_operaciones (id),
  precio numeric(14, 2),
  costo numeric(14, 2),
  ganancia numeric(14, 2),
  metodo metodo_venta not null default 'contado',
  monto_financiera numeric(14, 2),
  vendedor text not null,
  canal canal_venta,
  fecha date not null default current_date,
  credito_id uuid,
  creado_en timestamptz not null default now()
);

create index ventas_fecha_idx on public.ventas (fecha desc);

-- ===========================================================
-- Créditos propios y cuotas
-- ===========================================================
create table public.creditos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id),
  cliente_id uuid not null references public.clientes_operaciones (id),
  capital numeric(14, 2) not null,
  total_a_pagar numeric(14, 2) not null,
  cantidad_cuotas int not null,
  estado estado_credito not null default 'al_dia',
  creado_en date not null default current_date
);

create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  credito_id uuid not null references public.creditos (id) on delete cascade,
  numero int not null,
  vencimiento date not null,
  monto numeric(14, 2) not null,
  estado estado_cuota not null default 'pendiente',
  pagada_en date,
  unique (credito_id, numero)
);

create index cuotas_vencimiento_idx on public.cuotas (vencimiento);

-- ===========================================================
-- Taller: órdenes de trabajo y gastos asociados
-- ===========================================================
create table public.ordenes_taller (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  cliente_nombre text not null,
  unidad_id uuid references public.unidades_inventario (id),
  moto_descripcion text not null,
  motivo text not null,
  mecanico text not null,
  prioridad prioridad_tarea not null default 'media',
  estado estado_orden_taller not null default 'pendiente',
  fecha_ingreso date not null default current_date,
  fecha_estimada date,
  fecha_entrega date,
  observaciones text,
  creado_en timestamptz not null default now()
);

create table public.gastos_taller (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_taller (id) on delete cascade,
  tipo tipo_gasto_taller not null,
  descripcion text not null,
  monto numeric(14, 2) not null,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Inventario de repuestos
-- ===========================================================
create table public.repuestos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  categoria text not null,
  marca text,
  proveedor text,
  costo numeric(14, 2) not null default 0,
  precio numeric(14, 2) not null default 0,
  cantidad int not null default 0,
  stock_minimo int not null default 0,
  ubicacion text not null default '',
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Gastos generales
-- ===========================================================
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  categoria categoria_gasto not null,
  importe numeric(14, 2) not null,
  descripcion text not null,
  metodo_pago text not null,
  responsable text not null,
  proveedor text,
  creado_en timestamptz not null default now()
);

-- ===========================================================
-- Caja
-- ===========================================================
create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  tipo tipo_movimiento_caja not null,
  categoria categoria_caja not null,
  descripcion text not null,
  monto numeric(14, 2) not null,
  referencia text,
  creado_en timestamptz not null default now()
);

create index movimientos_caja_fecha_idx on public.movimientos_caja (fecha desc);

-- ===========================================================
-- Auditoría (inmutable)
-- ===========================================================
create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  usuario text not null,
  accion text not null,
  entidad text not null,
  detalle text not null default ''
);

create index auditoria_fecha_idx on public.auditoria (fecha desc);

create trigger auditoria_inmutable
  before update or delete on public.auditoria
  for each row execute function public.bloquear_modificacion();

-- ===========================================================
-- Automatizaciones (reglas de negocio del PRD)
-- ===========================================================

-- Todo movimiento de inventario genera una entrada de auditoría.
create or replace function public.auditar_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  etiqueta text;
begin
  select coalesce(u.dominio, u.marca || ' ' || u.modelo)
    into etiqueta
    from public.unidades_inventario u
    where u.id = new.unidad_id;
  insert into public.auditoria (usuario, accion, entidad, detalle)
  values (
    new.usuario,
    'Movimiento de inventario: ' || new.tipo,
    'Unidad ' || coalesce(etiqueta, new.unidad_id::text),
    new.motivo
  );
  return new;
end;
$$;

create trigger movimientos_inventario_auditados
  after insert on public.movimientos_inventario
  for each row execute function public.auditar_movimiento_inventario();

-- Toda venta descuenta stock: marca la unidad como vendida y deja kardex.
create or replace function public.aplicar_venta_en_inventario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.unidad_id is null then
    return new;
  end if;
  update public.unidades_inventario
    set estado = 'vendida',
        ubicacion = 'cliente',
        fecha_venta = new.fecha
    where id = new.unidad_id;
  insert into public.movimientos_inventario
    (unidad_id, tipo, origen, destino, motivo, usuario)
  values (
    new.unidad_id, 'venta', 'Salón', 'Cliente',
    'Venta registrada (' || new.metodo || ')', new.vendedor
  );
  return new;
end;
$$;

create trigger ventas_descuentan_stock
  after insert on public.ventas
  for each row execute function public.aplicar_venta_en_inventario();
