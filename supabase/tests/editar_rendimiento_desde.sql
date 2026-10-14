-- ============================================================================
-- Mero · Pruebas de editar "Rinde desde" (spec: docs/specs/rendimiento-ea.md, regla 4)
--
-- Ejecutar en MERO DEV tras aplicar las migraciones 20261014, 20261015 y 20261016.
-- Todo corre en una transacción que termina en ROLLBACK. No ejecutar en producción.
-- ============================================================================

begin;

do $$
declare
  u uuid; mid uuid; hoy date := (now() at time zone 'America/Bogota')::date;
  n int; d date; h date; s numeric;
begin
  select id into u from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1) Al activar sin fecha, rendimiento_desde queda guardado como hoy
  insert into public.medios (id, nombre, saldo, tasa_ea)
  values (gen_random_uuid(), '__desde_hoy__', 0, 9.30) returning rendimiento_desde into d;
  assert d = hoy, format('caso 1: rendimiento_desde debía ser %s y es %s', hoy, d);

  -- 2) Caja que rinde desde hace 2 días: 2 rendimientos
  insert into public.medios (id, nombre, saldo, tasa_ea, rendimiento_desde)
  values (gen_random_uuid(), '__desde_edit__', 1000000, 9.30, hoy - 2) returning id into mid;
  perform public.acreditar_mis_rendimientos();
  select count(*) into n from public.rendimientos where medio_id = mid;
  assert n = 2, format('caso 2: se esperaban 2 filas y hay %s', n);

  -- 3) Renombrar no cambia la fecha de inicio ni el avance
  update public.medios set nombre = '__desde_edit_2__' where id = mid;
  select rendimiento_desde, rendimiento_hasta into d, h from public.medios where id = mid;
  assert d = hoy - 2 and h = hoy - 1, format('caso 3: desde=%s hasta=%s', d, h);

  -- 4) Mover el inicio hacia ADELANTE se ignora
  update public.medios set rendimiento_desde = hoy - 1 where id = mid;
  select rendimiento_desde into d from public.medios where id = mid;
  assert d = hoy - 2, format('caso 4: hacia adelante debía ignorarse y quedó %s', d);

  -- 5) Mover el inicio hacia ATRÁS acredita los días anteriores, sin duplicar los existentes
  update public.medios set rendimiento_desde = hoy - 5 where id = mid;
  perform public.acreditar_mis_rendimientos();
  select count(*) into n from public.rendimientos where medio_id = mid;
  assert n = 5, format('caso 5: se esperaban 5 filas (hoy-5..hoy-1) y hay %s', n);
  select count(distinct fecha) into n from public.rendimientos where medio_id = mid;
  assert n = 5, 'caso 5: hay fechas duplicadas';
  select rendimiento_desde, rendimiento_hasta into d, h from public.medios where id = mid;
  assert d = hoy - 5 and h = hoy - 1, format('caso 5: desde=%s hasta=%s', d, h);

  -- 6) Fecha futura sigue rechazada
  begin
    update public.medios set rendimiento_desde = hoy + 1 where id = mid;
    raise exception 'caso 6: debía rechazar la fecha futura';
  exception when sqlstate '22023' then
    null;
  end;

  -- 7) Quitar la tasa limpia las fechas; reactivar parte de la nueva fecha elegida
  update public.medios set tasa_ea = null where id = mid;
  select rendimiento_desde, rendimiento_hasta into d, h from public.medios where id = mid;
  assert d is null and h is null, 'caso 7: al quitar la tasa deben limpiarse las fechas';

  reset role;
  raise notice 'Todos los casos pasaron';
end $$;

rollback;
