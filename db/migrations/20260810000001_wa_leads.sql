-- Vínculo WhatsApp ↔ Leads: cada conversación del bot tiene su lead en el CRM.
--
-- Mantener en sync con bot/src/db.ts (ensureSchema): el bot ejecuta este mismo
-- DDL idempotente en cada arranque. Esta migración cubre los inits frescos de
-- Postgres; el ensureSchema cubre las bases que ya existían.

alter table public.wa_conversaciones
  add column if not exists lead_id uuid references public.leads (id) on delete set null;

create index if not exists wa_conversaciones_lead_idx
  on public.wa_conversaciones (lead_id);

-- Backfill: las conversaciones que existían antes de esta migración no tienen
-- lead. Se les crea uno (o se las engancha al lead que ya tenga ese teléfono)
-- para que la ficha del panel no quede vacía esperando el próximo mensaje.
insert into public.leads (nombre, telefono, fuente, estado, score, score_motivo, notas)
select coalesce(nullif(trim(c.nombre), ''), 'Sin nombre'),
       c.telefono,
       'whatsapp',
       'contactado',
       -- Mismo piso que le pone el bot a un lead nuevo (bot/src/leads.ts):
       -- se recalcula solo con el próximo mensaje del cliente.
       10,
       'Escribió por WhatsApp. El bot todavía no cualificó esta charla.',
       'Lead creado automáticamente desde una conversación de WhatsApp anterior al bot cualificador.'
from public.wa_conversaciones c
where c.lead_id is null
  and not exists (
    select 1 from public.leads l where l.telefono = c.telefono
  );

-- El teléfono no es único en leads (se pueden haber cargado dos a mano): se
-- engancha al más reciente en vez de dejar que Postgres elija cualquiera.
update public.wa_conversaciones c
set lead_id = (
  select l.id from public.leads l
  where l.telefono = c.telefono
  order by l.creado_en desc
  limit 1
)
where c.lead_id is null;
