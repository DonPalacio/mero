-- ============================================================================
-- Mero · Pruebas de monthly_yields (spec: docs/specs/rendimiento-ea.md, regla 10)
--
-- Ejecutar en MERO DEV tras aplicar las migraciones 20261014 y 20261017. Requiere 2 usuarios
-- en auth.users. Todo corre en una transacción que termina en ROLLBACK. No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  a uuid; b uuid; bid uuid; today date := (now() at time zone 'America/Bogota')::date;
  range_start date := date_trunc('month', today)::date;
  range_end    date := (date_trunc('month', today) + interval '1 month')::date;
  current_month text := to_char(today, 'YYYY-MM');
  sum_a numeric; sum_b numeric; seen_a numeric; seen_b numeric; row_total int;
begin
  select id into a from auth.users order by created_at limit 1 offset 0;
  select id into b from auth.users order by created_at limit 1 offset 1;
  assert a <> b, 'se necesitan 2 usuarios';

  -- Caja de A con rendimientos de los últimos 3 días
  insert into public.boxes (user_id, name, balance, ea_rate, yield_from)
  values (a, '__mensual__', 1000000, 9.30, today - 3) returning id into bid;
  perform public.credit_yields(today - 1, a);

  -- Verdad calculada como administrador (sin RLS). B puede tener rendimientos propios.
  select coalesce(sum(amount), 0) into sum_a from public.yields
   where user_id = a and date >= range_start and date < range_end;
  select coalesce(sum(amount), 0) into sum_b from public.yields
   where user_id = b and date >= range_start and date < range_end;
  assert sum_a > 0, 'preparación: A debía tener rendimientos este mes';

  -- 1) Cada usuario suma solo lo suyo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(sum(total), 0) into seen_a
    from public.monthly_yields(range_start, range_end) where month = current_month;
  reset role;
  assert seen_a = sum_a, format('caso 1: A esperaba %s y obtuvo %s', sum_a, seen_a);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(sum(total), 0) into seen_b
    from public.monthly_yields(range_start, range_end) where month = current_month;
  reset role;
  assert seen_b = sum_b, format('caso 1: B esperaba %s y obtuvo %s (¿filtración?)', sum_b, seen_b);

  -- 2) Un rango sin datos no devuelve filas
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into row_total
    from public.monthly_yields(date '2000-01-01', date '2000-02-01');
  reset role;
  assert row_total = 0, 'caso 2: un rango vacío debía dar 0 filas';

  raise notice 'Todos los casos pasaron';
end $$;

rollback;
