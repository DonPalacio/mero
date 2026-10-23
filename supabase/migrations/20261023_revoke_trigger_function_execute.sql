-- ============================================================================
-- Mero · Migración: quita EXECUTE de las funciones de trigger SECURITY DEFINER
--
-- update_box_balance() y apply_yield_to_balance() solo las dispara la propia BD (triggers
-- sobre transactions y yields). Por defecto Postgres da EXECUTE a PUBLIC y Supabase lo
-- reparte a `anon` y `authenticated`, así que el linter las marca como llamables por
-- /rest/v1/rpc/... Aunque Postgres no deja invocar una función de trigger a mano, ningún
-- rol de la API necesita ese permiso: se quita como defensa en profundidad.
--
-- Los triggers siguen funcionando: Postgres solo comprueba EXECUTE al crear el trigger, no
-- al dispararlo, y el cuerpo corre con los privilegios del dueño (SECURITY DEFINER).
--
-- credit_my_yields() y reset_yields(uuid) NO se tocan: la app las llama como `authenticated`
-- y ya validan auth.uid() (anon ya no tiene EXECUTE sobre ellas).
--
-- Orden de aplicación: después de 20261018. Es idempotente (REVOKE se puede repetir).
-- ============================================================================

revoke execute on function public.update_box_balance() from public, anon, authenticated;
revoke execute on function public.apply_yield_to_balance() from public, anon, authenticated;
