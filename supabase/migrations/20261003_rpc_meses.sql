-- ============================================================================
-- Mero · Migración: función meses_con_movimientos(desde)
-- Devuelve los meses ("YYYY-MM", más reciente primero) que tienen al menos un
-- movimiento desde `desde`. Reemplaza la lectura de TODAS las fechas desde el
-- cliente, que PostgREST cortaba en 1000 filas (los meses antiguos desaparecían
-- del selector) y cuyo tamaño crecía con cada movimiento.
--
-- Aditiva: la app actual no la usa hasta que se despliegue el cambio de código,
-- así que se aplica ANTES de ese despliegue. `security invoker` (por defecto):
-- corre con los permisos del usuario, por lo que RLS sigue limitando a sus filas.
--
-- Reversión: drop function public.meses_con_movimientos(date);
-- ============================================================================

create or replace function public.meses_con_movimientos(desde date)
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select distinct to_char(fecha, 'YYYY-MM') as mes
    from public.movimientos
   where fecha >= desde
   order by mes desc;
$$;

revoke all on function public.meses_con_movimientos(date) from public, anon;
grant execute on function public.meses_con_movimientos(date) to authenticated;

-- ============================================================================
-- Verificación (ejecutar aparte; en el SQL Editor corre como postgres, sin RLS
-- de usuario, así que lista los meses de TODOS los usuarios):
--
--   select * from public.meses_con_movimientos(date '2024-01-01');
-- ============================================================================
