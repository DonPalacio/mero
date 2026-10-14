-- ============================================================================
-- Mero · Migración: reiniciar los rendimientos acumulados de una caja
-- Spec: docs/specs/rendimiento-ea.md (regla 9)
--
-- Aditiva: solo crea una función. No toca datos ni esquema existente.
-- Idempotente (create or replace). Aplicar a mano en cada proyecto de Supabase.
--
-- Reversión: drop function public.reiniciar_rendimientos(uuid);
-- ============================================================================

-- Borra el historial de rendimientos de UNA caja del usuario autenticado y resta esa suma
-- de su saldo. La tasa y rendimiento_hasta no cambian: el job de la noche sigue desde donde
-- iba, sin volver a acreditar días anteriores. Devuelve cuánto se restó.
create or replace function public.reiniciar_rendimientos(p_medio uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_total numeric;
begin
  if v_user is null then
    raise exception 'Se requiere una sesión activa' using errcode = '28000';
  end if;

  -- La caja debe ser del usuario; se bloquea la fila para no cruzarse con el job.
  perform 1 from public.medios where id = p_medio and user_id = v_user for update;
  if not found then
    raise exception 'Caja no encontrada' using errcode = 'P0002';
  end if;

  select coalesce(sum(monto), 0) into v_total
    from public.rendimientos
   where medio_id = p_medio and user_id = v_user;

  if v_total = 0 then
    return 0;
  end if;

  delete from public.rendimientos where medio_id = p_medio and user_id = v_user;

  -- Misma bandera que usa el trigger de saldo: solo así trg_proteger_saldo deja pasar el cambio.
  perform set_config('mero.ajuste_saldo', '1', true);
  update public.medios
     set saldo = saldo - v_total, updated_at = now()
   where id = p_medio;
  perform set_config('mero.ajuste_saldo', '', true);

  return v_total;
end;
$$;

revoke all on function public.reiniciar_rendimientos(uuid) from public, anon;
grant execute on function public.reiniciar_rendimientos(uuid) to authenticated;
