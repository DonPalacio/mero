-- ============================================================================
-- Mero · Pruebas de editar "Rinde desde" (spec: docs/specs/ea-yield.md, regla 4)
--
-- Ejecutar en MERO DEV tras aplicar las migraciones 20261014, 20261015 y 20261016.
-- Todo corre en una transacción que termina en ROLLBACK. No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  u uuid; bid uuid; today date := (now() at time zone 'America/Bogota')::date;
  n int; d date; h date; s numeric;
begin
  select id into u from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1) Al activar sin fecha, yield_from queda guardado como hoy
  insert into public.boxes (id, name, balance, ea_rate)
  values (gen_random_uuid(), '__desde_hoy__', 0, 9.30) returning yield_from into d;
  assert d = today, format('caso 1: yield_from debía ser %s y es %s', today, d);

  -- 2) Caja que rinde desde hace 2 días: 2 rendimientos
  insert into public.boxes (id, name, balance, ea_rate, yield_from)
  values (gen_random_uuid(), '__desde_edit__', 1000000, 9.30, today - 2) returning id into bid;
  perform public.credit_my_yields();
  select count(*) into n from public.yields where box_id = bid;
  assert n = 2, format('caso 2: se esperaban 2 filas y hay %s', n);

  -- 3) Renombrar no cambia la fecha de inicio ni el avance
  update public.boxes set name = '__desde_edit_2__' where id = bid;
  select yield_from, yield_until into d, h from public.boxes where id = bid;
  assert d = today - 2 and h = today - 1, format('caso 3: desde=%s hasta=%s', d, h);

  -- 4) Mover el inicio hacia ADELANTE se ignora
  update public.boxes set yield_from = today - 1 where id = bid;
  select yield_from into d from public.boxes where id = bid;
  assert d = today - 2, format('caso 4: hacia adelante debía ignorarse y quedó %s', d);

  -- 5) Mover el inicio hacia ATRÁS acredita los días anteriores, sin duplicar los existentes
  update public.boxes set yield_from = today - 5 where id = bid;
  perform public.credit_my_yields();
  select count(*) into n from public.yields where box_id = bid;
  assert n = 5, format('caso 5: se esperaban 5 filas (hoy-5..hoy-1) y hay %s', n);
  select count(distinct date) into n from public.yields where box_id = bid;
  assert n = 5, 'caso 5: hay fechas duplicadas';
  select yield_from, yield_until into d, h from public.boxes where id = bid;
  assert d = today - 5 and h = today - 1, format('caso 5: desde=%s hasta=%s', d, h);

  -- 6) Fecha futura sigue rechazada
  begin
    update public.boxes set yield_from = today + 1 where id = bid;
    raise exception 'caso 6: debía rechazar la fecha futura';
  exception when sqlstate '22023' then
    null;
  end;

  -- 7) Quitar la tasa limpia las fechas; reactivar parte de la nueva fecha elegida
  update public.boxes set ea_rate = null where id = bid;
  select yield_from, yield_until into d, h from public.boxes where id = bid;
  assert d is null and h is null, 'caso 7: al quitar la tasa deben limpiarse las fechas';

  reset role;
  raise notice 'Todos los casos pasaron';
end $$;

rollback;
