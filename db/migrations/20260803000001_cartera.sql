-- Cartera real de créditos (archivos/control de cuotas.xlsx).
--
-- La planilla del cliente registra por crédito: número de plan, cliente,
-- moto, cantidad de cuotas y cuota mensual. No registra la venta de origen,
-- el capital, el total ni el historial de pagos — por eso esas columnas
-- pasan a ser opcionales: no se inventa lo que la fuente no tiene.

alter table public.creditos
  alter column venta_id drop not null,
  alter column capital drop not null,
  alter column total_a_pagar drop not null,
  alter column cantidad_cuotas drop not null,
  add column numero int unique,
  add column descripcion_moto text,
  add column cuota_mensual numeric(14, 2),
  add column observaciones text;
