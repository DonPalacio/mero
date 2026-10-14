-- ============================================================================
-- Mero · Migración: totales mensuales de rendimientos E.A. para el dashboard
-- Spec: docs/specs/rendimiento-ea.md (regla 10)
--
-- Aditiva: solo crea una función de lectura. SECURITY INVOKER, así que aplica la RLS
-- de `rendimientos` (cada usuario suma solo lo suyo). Mismo patrón que resumen_mensual.
-- Aplicar a mano, después de 20261014_rendimiento_diario.sql.
--
-- Reversión: drop function public.rendimientos_mensuales(date, date);
-- ============================================================================

create or replace function public.rendimientos_mensuales(desde date, hasta date)
returns table (mes text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select to_char(r.fecha, 'YYYY-MM'), sum(r.monto)
    from public.rendimientos r
   where r.fecha >= desde
     and r.fecha <  hasta
   group by 1
   order by 1;
$$;

revoke all on function public.rendimientos_mensuales(date, date) from public, anon;
grant execute on function public.rendimientos_mensuales(date, date) to authenticated;
