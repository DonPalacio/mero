-- ============================================================================
-- Mero · Migración: políticas RLS con (select auth.uid())
-- Con `auth.uid()` a secas, Postgres lo evalúa por cada fila; envuelto en un
-- `select` se evalúa una sola vez por consulta (initPlan). El resultado es el
-- mismo: sigue exigiendo auth.uid() = user_id. De paso se limitan las políticas
-- al rol `authenticated` (anon no tiene auth.uid(), así que ya no podía pasar).
--
-- Seguro de ejecutar en producción: ALTER POLICY es atómico, no bloquea lecturas
-- ni escrituras y no toca datos ni triggers (no cambia medios.saldo).
-- Si algún nombre de política no existe, falla y TODO se revierte (una sola
-- transacción): en ese caso compara con
--   select tablename, policyname from pg_policies where schemaname = 'public';
--
-- Reversión: repetir este archivo cambiando `(select auth.uid())` por `auth.uid()`
-- y quitando la línea `to authenticated`.
-- ============================================================================

begin;

-- categorias ---------------------------------------------------------------------
alter policy select_own_cajitas on public.categorias
  to authenticated using ((select auth.uid()) = user_id);
alter policy insert_own_cajitas on public.categorias
  to authenticated with check ((select auth.uid()) = user_id);
alter policy update_own_cajitas on public.categorias
  to authenticated using ((select auth.uid()) = user_id);
alter policy delete_own_cajitas on public.categorias
  to authenticated using ((select auth.uid()) = user_id);

-- medios -------------------------------------------------------------------------
alter policy "usuarios ven sus medios" on public.medios
  to authenticated using ((select auth.uid()) = user_id);
alter policy "usuarios insertan sus medios" on public.medios
  to authenticated with check ((select auth.uid()) = user_id);
alter policy "usuarios actualizan sus medios" on public.medios
  to authenticated using ((select auth.uid()) = user_id);
alter policy "usuarios borran sus medios" on public.medios
  to authenticated using ((select auth.uid()) = user_id);

-- movimientos --------------------------------------------------------------------
alter policy select_own_movimientos on public.movimientos
  to authenticated using ((select auth.uid()) = user_id);
alter policy insert_own_movimientos on public.movimientos
  to authenticated with check ((select auth.uid()) = user_id);
alter policy update_own_movimientos on public.movimientos
  to authenticated using ((select auth.uid()) = user_id);
alter policy delete_own_movimientos on public.movimientos
  to authenticated using ((select auth.uid()) = user_id);

commit;

-- ============================================================================
-- Verificación (ejecutar aparte tras el commit):
--
--   select tablename, policyname, roles, qual, with_check
--     from pg_policies where schemaname = 'public' order by 1, 2;
--   -- 12 filas, roles = {authenticated}, y `( SELECT auth.uid() ...)` en qual/with_check
--
--   -- Los saldos no deben cambiar:
--   select nombre, saldo from public.medios order by nombre;
-- ============================================================================
