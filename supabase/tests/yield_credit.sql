-- ============================================================================
-- Mero · Pruebas de rendimiento diario (spec: docs/specs/rendimiento-ea.md)
--
-- Ejecutar en el SQL Editor de MERO DEV, DESPUÉS de aplicar
-- supabase/migrations/20261014_rendimiento_diario.sql.
-- Todo corre dentro de una transacción que termina en ROLLBACK: no deja datos.
-- Usa el primer usuario de auth.users. Un fallo lanza una excepción con el caso.
-- No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  u    uuid;
  bid  uuid;
  today  date := (now() at time zone 'America/Bogota')::date;
  n    integer;
  s    numeric;
  prev numeric;
begin
  select id into u from auth.users order by created_at limit 1;
  assert u is not null, 'Se necesita al menos un usuario en auth.users';

  -- 1) 1.000.000 al 9,30 % E.A. rinde 243,66 en un día ---------------------------------
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (u, '__test_ea_1__', 1000000, 9.30, today - 1)
  returning id into bid;

  n := public.credit_yields(today - 1, u);
  assert n = 1, format('caso 1: se esperaba 1 fila, hubo %s', n);

  select amount into s from public.yields where box_id = bid and date = today - 1;
  assert s = 243.66, format('caso 1: monto esperado 243.66, fue %s', s);

  select balance into s from public.boxes where id = bid;
  assert s = 1000243.66, format('caso 1: saldo esperado 1000243.66, fue %s', s);

  -- 2) Idempotencia: repetir el mismo día no duplica ni cambia el saldo -----------------
  n := public.credit_yields(today - 1, u);
  assert n = 0, format('caso 2: repetir debía dar 0, dio %s', n);
  select balance into prev from public.boxes where id = bid;
  assert prev = 1000243.66, 'caso 2: el saldo cambió al repetir';

  -- 3) Capitalización: el segundo día rinde sobre el saldo con el primer rendimiento -----
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (u, '__test_ea_cap__', 1000000, 9.30, today - 2) returning id into bid;
  n := public.credit_yields(today - 1, u);
  assert n = 2, format('caso 3: se esperaban 2 filas, hubo %s', n);
  select base_balance into s from public.yields where box_id = bid and date = today - 1;
  assert s = 1000243.66, format('caso 3: la base del 2.º día debía ser 1000243.66, fue %s', s);

  -- 3b) El saldo no se puede escribir directamente (trg_proteger_saldo) ---------------------
  update public.boxes set balance = 5 where id = bid;
  select balance into prev from public.boxes where id = bid;
  assert prev > 1000000, 'caso 3b: el UPDATE directo de saldo debía ignorarse';

  -- 4) Saldo 0 o negativo y tasa null no generan filas ----------------------------------
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (u, '__test_ea_cero__', 0, 9.30, today - 1) returning id into bid;
  n := public.credit_yields(today - 1, u);
  assert not exists (select 1 from public.yields where box_id = bid),
    'caso 4: saldo 0 no debe rendir';

  insert into public.boxes (user_id, name, balance, ea_rate)
  values (u, '__test_ea_null__', 500000, null) returning id into bid;
  n := public.credit_yields(today - 1, u);
  assert not exists (select 1 from public.yields where box_id = bid),
    'caso 4: tasa null no debe rendir';

  -- 5) Retroactivo: inicio hace 10 días acredita 10 días de una vez, capitalizando -------
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (u, '__test_ea_retro__', 1000000, 9.30, today - 10) returning id into bid;
  n := public.credit_yields(today - 1, u);
  assert n = 10, format('caso 5: se esperaban 10 filas, hubo %s', n);
  select balance into s from public.boxes where id = bid;
  -- 1.000.000 * 1,093^(10/365) ≈ 1.002.440,6 (±0,10 por redondeo diario a 2 decimales)
  assert abs(s - round(1000000 * power(1.093::numeric, 10.0 / 365), 2)) < 0.10,
    format('caso 5: saldo inesperado %s', s);

  -- 6) Fecha de inicio futura se rechaza ---------------------------------------------------
  begin
    insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
    values (u, '__test_ea_futuro__', 100, 9.30, today + 1);
    raise exception 'caso 6: debía rechazar la fecha futura';
  exception when sqlstate '22023' then
    null; -- esperado
  end;

  -- 7) Un movimiento posterior a d no cuenta para la base de d --------------------------
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (u, '__test_ea_mov__', 0, 9.30, today - 2) returning id into bid;
  insert into public.transactions (user_id, type, amount, date, box_id)
  values (u, 'income', 1000000, today - 1, bid);   -- el trigger suma 1.000.000 al saldo
  n := public.credit_yields(today - 1, u);
  assert not exists (select 1 from public.yields where box_id = bid and date = today - 2),
    'caso 7: el ingreso de hoy-1 no debía rendir en hoy-2';
  assert exists (select 1 from public.yields where box_id = bid and date = today - 1),
    'caso 7: el día hoy-1 sí debía rendir';

  raise notice 'Todos los casos pasaron';
end $$;

-- 8) El cliente (rol authenticated) no puede escribir rendimientos --------------------
do $$
declare
  u uuid;
begin
  select id into u from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.yields (box_id, date, base_balance, ea_rate, amount)
    select id, current_date, 1, 1, 1 from public.boxes limit 1;
    raise exception 'caso 8: el cliente pudo insertar en rendimientos';
  exception when insufficient_privilege then
    null; -- esperado
  end;
  reset role;
end $$;

rollback;
