-- ============================================================================
-- Mero · Migración: función resumen_mensual(desde, hasta)
-- Totales de movimientos por mes, tipo y categoría en el rango [desde, hasta).
-- El dashboard descargaba las filas completas de 6 meses solo para sumarlas en el
-- navegador; con esta función pide unas pocas filas agregadas.
--
-- Solo cuenta movimientos CON categoría: los traspasos sin categoría quedan fuera
-- a propósito, igual que en los totales actuales del dashboard (y los movimientos
-- cuya categoría se borró, que la BD deja con categoria_id nulo).
-- No filtra _deleted, igual que las lecturas actuales de la app (que tampoco lo
-- hacen). Si se activa el borrado lógico, hay que ajustar ambas partes a la vez.
--
-- Aditiva: la app actual no la usa hasta que se despliegue el cambio de código,
-- así que se aplica ANTES de ese despliegue. `security invoker` (por defecto): corre
-- con los permisos del usuario, por lo que RLS limita el resultado a sus filas.
--
-- Reversión: drop function public.resumen_mensual(date, date);
-- ============================================================================

create or replace function public.resumen_mensual(desde date, hasta date)
returns table (mes text, tipo text, categoria_id uuid, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select to_char(m.fecha, 'YYYY-MM'), m.tipo, m.categoria_id, sum(m.monto)
    from public.movimientos m
   where m.fecha >= desde
     and m.fecha <  hasta
     and m.categoria_id is not null
   group by 1, 2, 3
   order by 1, 2;
$$;

revoke all on function public.resumen_mensual(date, date) from public, anon;
grant execute on function public.resumen_mensual(date, date) to authenticated;

-- ============================================================================
-- Verificación (ejecutar aparte; en el SQL Editor corre como postgres, sin RLS de
-- usuario, así que agrega los movimientos de TODOS los usuarios):
--
--   select * from public.resumen_mensual(date '2026-05-01', date '2026-11-01');
--
-- Para comparar con la app, filtra a tu usuario con una consulta equivalente:
--   select to_char(fecha,'YYYY-MM') mes, tipo, categoria_id, sum(monto)
--     from public.movimientos
--    where user_id = '<tu user id>' and categoria_id is not null
--      and fecha >= date '2026-05-01' and fecha < date '2026-11-01'
--    group by 1,2,3 order by 1,2;
-- ============================================================================
