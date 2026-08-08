-- Día de pago y primer vencimiento del plan de créditos.
--
-- La cartera importada guarda el día de pago acordado como texto libre dentro
-- de las observaciones de la planilla ("todos los 16", "paga los 15"). Así el
-- sistema no puede calcular vencimientos: hay que leer el comentario a mano.
-- Estas dos columnas lo convierten en dato, y con ellas el plan de cuotas
-- (y por lo tanto la mora) se deriva en lugar de cargarse cuota por cuota.

alter table public.creditos
  add column dia_pago int check (dia_pago between 1 and 31),
  add column fecha_inicio date;

comment on column public.creditos.dia_pago is
  'Día del mes en que vence cada cuota. Si el mes no llega a ese día, vence el último.';
comment on column public.creditos.fecha_inicio is
  'Vencimiento de la cuota 1: ancla del plan.';

-- Backfill para bases ya sembradas (en una base nueva las tablas están vacías
-- acá: los valores los carga scripts/seed.ts).
with anotado as (
  select
    id,
    (
      substring(lower(observaciones) from '(?:todos los|paga los|paga)[[:space:]]+([0-9]{1,2})')
    )::int as dia
  from public.creditos
  where observaciones is not null
)
update public.creditos c
set dia_pago = a.dia
from anotado a
where a.id = c.id and a.dia between 1 and 31;

-- El primer vencimiento conocido de cada plan ancla el resto de las cuotas.
update public.creditos c
set fecha_inicio = primera.vencimiento
from (
  select credito_id, min(vencimiento) as vencimiento
  from public.cuotas
  group by credito_id
) primera
where primera.credito_id = c.id;
