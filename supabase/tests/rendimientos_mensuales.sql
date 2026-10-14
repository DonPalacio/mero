-- ============================================================================
-- Mero · Pruebas de rendimientos_mensuales (spec: docs/specs/rendimiento-ea.md, regla 10)
--
-- Ejecutar en MERO DEV tras aplicar las migraciones 20261014 y 20261017. Requiere 2 usuarios
-- en auth.users. Todo corre en una transacción que termina en ROLLBACK. No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  a uuid; b uuid; mid uuid; hoy date := (now() at time zone 'America/Bogota')::date;
  inicio date := date_trunc('month', hoy)::date;
  fin    date := (date_trunc('month', hoy) + interval '1 month')::date;
  mes_hoy text := to_char(hoy, 'YYYY-MM');
  suma_a numeric; suma_b numeric; vista_a numeric; vista_b numeric; filas int;
begin
  select id into a from auth.users order by created_at limit 1 offset 0;
  select id into b from auth.users order by created_at limit 1 offset 1;
  assert a <> b, 'se necesitan 2 usuarios';

  -- Caja de A con rendimientos de los últimos 3 días
  insert into public.medios (user_id, nombre, saldo, tasa_ea, rendimiento_desde)
  values (a, '__mensual__', 1000000, 9.30, hoy - 3) returning id into mid;
  perform public.acreditar_rendimientos(hoy - 1, a);

  -- Verdad calculada como administrador (sin RLS). B puede tener rendimientos propios.
  select coalesce(sum(monto), 0) into suma_a from public.rendimientos
   where user_id = a and fecha >= inicio and fecha < fin;
  select coalesce(sum(monto), 0) into suma_b from public.rendimientos
   where user_id = b and fecha >= inicio and fecha < fin;
  assert suma_a > 0, 'preparación: A debía tener rendimientos este mes';

  -- 1) Cada usuario suma solo lo suyo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(sum(total), 0) into vista_a
    from public.rendimientos_mensuales(inicio, fin) where mes = mes_hoy;
  reset role;
  assert vista_a = suma_a, format('caso 1: A esperaba %s y obtuvo %s', suma_a, vista_a);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(sum(total), 0) into vista_b
    from public.rendimientos_mensuales(inicio, fin) where mes = mes_hoy;
  reset role;
  assert vista_b = suma_b, format('caso 1: B esperaba %s y obtuvo %s (¿filtración?)', suma_b, vista_b);

  -- 2) Un rango sin datos no devuelve filas
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into filas
    from public.rendimientos_mensuales(date '2000-01-01', date '2000-02-01');
  reset role;
  assert filas = 0, 'caso 2: un rango vacío debía dar 0 filas';

  raise notice 'Todos los casos pasaron';
end $$;

rollback;
