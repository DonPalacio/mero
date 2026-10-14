-- ============================================================================
-- Mero · Pruebas de reset_yields (spec: docs/specs/rendimiento-ea.md, regla 9)
--
-- Ejecutar en MERO DEV tras aplicar 20261014_rendimiento_diario.sql y
-- 20261015_reiniciar_rendimientos.sql. Requiere 2 usuarios en auth.users.
-- Todo corre en una transacción que termina en ROLLBACK. No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  a uuid; b uuid; bid uuid; today date := (now() at time zone 'America/Bogota')::date;
  total numeric; balance_x numeric; n int; removed numeric; until_before date; until_after date; ok boolean;
begin
  select id into a from auth.users order by created_at limit 1 offset 0;
  select id into b from auth.users order by created_at limit 1 offset 1;
  assert a <> b, 'se necesitan 2 usuarios';

  -- Caja de A con 1.000.000 y 5 días de rendimiento
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (a, '__reinicio__', 1000000, 9.30, today - 5) returning id into bid;
  perform public.credit_yields(today - 1, a);
  select coalesce(sum(amount),0), count(*) into total, n from public.yields where box_id = bid;
  assert n = 5 and total > 0, 'preparación';
  select yield_until into until_before from public.boxes where id = bid;

  -- 1) El usuario B NO puede reiniciar la caja de A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.reset_yields(bid);
    ok := false;
  exception when sqlstate 'P0002' then
    ok := true;
  end;
  reset role;
  assert ok, 'caso 1: B pudo reiniciar la caja de A';
  select count(*) into n from public.yields where box_id = bid;
  assert n = 5, 'caso 1: los rendimientos de A cambiaron';

  -- 2) A reinicia: se resta exactamente lo acreditado y desaparece el historial
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  removed := public.reset_yields(bid);
  reset role;
  assert removed = total, format('caso 2: se esperaba restar %s y fue %s', total, removed);
  select balance into balance_x from public.boxes where id = bid;
  assert balance_x = 1000000, format('caso 2: el saldo debía volver a 1000000 y es %s', balance_x);
  select count(*) into n from public.yields where box_id = bid;
  assert n = 0, 'caso 2: el historial debía quedar vacío';

  -- 3) No se vuelve a pagar hacia atrás: yield_until no cambia y repetir acredita 0
  select yield_until, ea_rate is not null into until_after, ok from public.boxes where id = bid;
  assert until_after = until_before and ok, 'caso 3: la tasa o el avance cambiaron';
  assert public.credit_yields(today - 1, a) = 0, 'caso 3: no debía re-acreditar días pasados';

  -- 4) Reiniciar sin rendimientos devuelve 0 y no toca el saldo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  removed := public.reset_yields(bid);
  reset role;
  assert removed = 0, 'caso 4: debía devolver 0';

  -- 5) Sin sesión se rechaza
  perform set_config('request.jwt.claims', '', true);
  set local role authenticated;
  begin
    perform public.reset_yields(bid);
    ok := false;
  exception when sqlstate '28000' then
    ok := true;
  end;
  reset role;
  assert ok, 'caso 5: sin sesión debía rechazar';

  raise notice 'Todos los casos pasaron';
end $$;

rollback;
