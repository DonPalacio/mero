-- ============================================================================
-- Mero · REVERSA de 20261018_english_naming.sql (solo emergencia)
--
-- Devuelve la BD a la nomenclatura en español (tablas, columnas, funciones, valores
-- 'ingreso'/'gasto'). NO está en supabase/migrations a propósito: no debe aplicarse
-- por error. Úsala solo si el corte a inglés falla y no se puede volver a la versión
-- de la app compatible. Después hay que volver a desplegar la app anterior.
--
-- Una transacción con guardas: compara conteos y suma de saldos antes y después.
-- ============================================================================

begin;

create temp table _english_naming_revert_check on commit drop as
select
  (select count(*) from public.categories)   as categories_n,
  (select count(*) from public.boxes)        as boxes_n,
  (select count(*) from public.transactions) as transactions_n,
  (select count(*) from public.yields)       as yields_n,
  (select coalesce(sum(balance), 0) from public.boxes) as balance_sum;

-- 1) Datos: 'income'/'expense' → 'ingreso'/'gasto' (con el trigger de saldo apagado)
alter table public.categories   drop constraint categories_type_check;
alter table public.transactions drop constraint transactions_type_check;

alter table public.transactions disable trigger trg_update_box_balance;
update public.transactions
   set type = case type when 'income' then 'ingreso' when 'expense' then 'gasto' else type end
 where type in ('income', 'expense');
update public.categories
   set type = case type when 'income' then 'ingreso' when 'expense' then 'gasto' else type end
 where type in ('income', 'expense');
alter table public.transactions enable trigger trg_update_box_balance;

-- 2) Triggers, cron y funciones en inglés
select cron.unschedule(jobid) from cron.job where jobname in ('daily-yield', 'rendimiento-diario');

drop trigger if exists trg_update_box_balance on public.transactions;
drop trigger if exists trg_protect_balance    on public.boxes;
drop trigger if exists trg_prepare_yield      on public.boxes;
drop trigger if exists trg_apply_yield        on public.yields;

drop function public.update_box_balance();
drop function public.protect_box_balance();
drop function public.prepare_box_yield();
drop function public.apply_yield_to_balance();
drop function public.credit_yields(date, uuid);
drop function public.credit_my_yields();
drop function public.reset_yields(uuid);
drop function public.monthly_summary(date, date);
drop function public.months_with_transactions(date);
drop function public.monthly_yields(date, date);

-- 3) Renombres inversos
-- columnas, constraints, índices y políticas (aún con tablas en inglés)
alter policy select_own_yields on public.yields rename to select_own_rendimientos;
alter policy delete_own_transactions on public.transactions rename to delete_own_movimientos;
alter policy update_own_transactions on public.transactions rename to update_own_movimientos;
alter policy insert_own_transactions on public.transactions rename to insert_own_movimientos;
alter policy select_own_transactions on public.transactions rename to select_own_movimientos;
alter policy delete_own_boxes on public.boxes rename to "usuarios borran sus medios"    ;
alter policy update_own_boxes on public.boxes rename to "usuarios actualizan sus medios";
alter policy insert_own_boxes on public.boxes rename to "usuarios insertan sus medios"  ;
alter policy select_own_boxes on public.boxes rename to "usuarios ven sus medios"       ;
alter policy delete_own_categories on public.categories rename to delete_own_cajitas;
alter policy update_own_categories on public.categories rename to update_own_cajitas;
alter policy insert_own_categories on public.categories rename to insert_own_cajitas;
alter policy select_own_categories on public.categories rename to select_own_cajitas;
alter index public.idx_yields_user_date rename to idx_rendimientos_user_fecha;
alter index public.transactions_user_date_idx rename to movimientos_user_fecha_idx;
alter index public.idx_transactions_user_id rename to idx_movimientos_user_id;
alter index public.idx_transactions_sync rename to idx_movimientos_sync;
alter index public.idx_transactions_box_id rename to idx_movimientos_medio_id;
alter index public.idx_transactions_date rename to idx_movimientos_fecha;
alter index public.idx_transactions_category_id rename to idx_movimientos_categoria_id;
alter index public.idx_boxes_user_id rename to idx_medios_user_id;
alter index public.idx_boxes_sync rename to idx_medios_sync;
alter index public.boxes_user_name_active_key rename to medios_user_nombre_activo_key;
alter index public.idx_categories_user_id rename to idx_categorias_user_id;
alter index public.idx_categories_sync rename to idx_categorias_sync;
alter index public.categories_user_name_active_key rename to categorias_user_nombre_activo_key;
alter table public.yields rename constraint yields_box_id_fkey to rendimientos_medio_id_fkey;
alter table public.yields rename constraint yields_user_id_fkey to rendimientos_user_id_fkey;
alter table public.yields rename constraint yields_box_date_key to rendimientos_medio_fecha_key;
alter table public.yields rename constraint yields_amount_check to rendimientos_monto_check;
alter table public.yields rename constraint yields_pkey to rendimientos_pkey;
alter table public.transactions rename constraint transactions_category_id_fkey to movimientos_categoria_id_fkey;
alter table public.transactions rename constraint transactions_box_id_fkey to movimientos_medio_id_fkey;
alter table public.transactions rename constraint transactions_user_id_fkey to movimientos_user_id_fkey;
alter table public.transactions rename constraint transactions_amount_check to movimientos_monto_check;
alter table public.transactions rename constraint transactions_pkey to movimientos_pkey;
alter table public.boxes rename constraint boxes_user_id_fkey to medios_user_id_fkey;
alter table public.boxes rename constraint boxes_ea_rate_check to medios_tasa_ea_check;
alter table public.boxes rename constraint boxes_pkey to medios_pkey;
alter table public.categories rename constraint categories_user_id_fkey to cajitas_user_id_fkey;
alter table public.categories rename constraint categories_pkey to cajitas_pkey;
alter table public.yields rename column amount to monto;
alter table public.yields rename column ea_rate to tasa_ea;
alter table public.yields rename column base_balance to saldo_base;
alter table public.yields rename column date to fecha;
alter table public.yields rename column box_id to medio_id;
alter table public.transactions rename column category_id to categoria_id;
alter table public.transactions rename column box_id to medio_id;
alter table public.transactions rename column description to descripcion;
alter table public.transactions rename column date to fecha;
alter table public.transactions rename column amount to monto;
alter table public.transactions rename column type to tipo;
alter table public.boxes rename column yield_until to rendimiento_hasta;
alter table public.boxes rename column yield_from to rendimiento_desde;
alter table public.boxes rename column ea_rate to tasa_ea;
alter table public.boxes rename column balance to saldo;
alter table public.boxes rename column icon to icono;
alter table public.boxes rename column name to nombre;
alter table public.categories rename column monthly_budget to presupuesto_mensual;
alter table public.categories rename column type to tipo;
alter table public.categories rename column icon to icono;
alter table public.categories rename column name to nombre;

-- tablas
alter table public.yields rename to rendimientos;
alter table public.transactions rename to movimientos;
alter table public.boxes rename to medios;
alter table public.categories rename to categorias;

alter table public.categorias   add constraint cajitas_tipo_check
  check (tipo = any (array['ingreso', 'gasto']));
alter table public.movimientos  add constraint movimientos_tipo_check
  check (tipo = any (array['ingreso', 'gasto']));
alter table public.categorias alter column tipo set default 'gasto';

-- 4) Funciones y triggers en español (versiones finales de las migraciones originales)
create or replace function public.actualizar_saldo_medio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  efecto_old numeric := 0;
  efecto_new numeric := 0;
begin
  perform set_config('mero.ajuste_saldo', '1', true);

  if tg_op in ('UPDATE', 'DELETE') and not old._deleted then
    efecto_old := case when old.tipo = 'ingreso' then old.monto else -old.monto end;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and not new._deleted then
    efecto_new := case when new.tipo = 'ingreso' then new.monto else -new.monto end;
  end if;

  if tg_op = 'INSERT' then
    update public.medios set saldo = saldo + efecto_new, updated_at = now() where id = new.medio_id;
  elsif tg_op = 'DELETE' then
    update public.medios set saldo = saldo - efecto_old, updated_at = now() where id = old.medio_id;
  else
    if old.medio_id = new.medio_id then
      update public.medios
         set saldo = saldo - efecto_old + efecto_new, updated_at = now() where id = new.medio_id;
    else
      update public.medios set saldo = saldo - efecto_old, updated_at = now() where id = old.medio_id;
      update public.medios set saldo = saldo + efecto_new, updated_at = now() where id = new.medio_id;
    end if;
  end if;

  perform set_config('mero.ajuste_saldo', '', true);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_actualizar_saldo_medio
  after insert or update or delete on public.movimientos
  for each row execute function public.actualizar_saldo_medio();

create or replace function public.proteger_saldo_medio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('mero.ajuste_saldo', true), '') <> '1' then
    new.saldo := old.saldo;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_saldo
  before update on public.medios
  for each row execute function public.proteger_saldo_medio();

create or replace function public.preparar_rendimiento_medio()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if coalesce(current_setting('mero.ajuste_rendimiento', true), '') = '1' then
    return new;
  end if;

  if new.rendimiento_desde is not null and new.rendimiento_desde > hoy then
    raise exception 'La fecha de inicio del rendimiento no puede ser futura'
      using errcode = '22023';
  end if;

  if coalesce(new.tasa_ea, 0) = 0 then
    new.rendimiento_desde := null;
    new.rendimiento_hasta := null;
  elsif tg_op = 'INSERT' or coalesce(old.tasa_ea, 0) = 0 then
    new.rendimiento_desde := coalesce(new.rendimiento_desde, hoy);
    new.rendimiento_hasta := new.rendimiento_desde - 1;
  elsif new.rendimiento_desde is not null
        and old.rendimiento_desde is not null
        and new.rendimiento_desde < old.rendimiento_desde then
    new.rendimiento_hasta := new.rendimiento_desde - 1;
  else
    new.rendimiento_desde := old.rendimiento_desde;
    new.rendimiento_hasta := old.rendimiento_hasta;
  end if;

  return new;
end;
$$;

create trigger trg_preparar_rendimiento
  before insert or update on public.medios
  for each row execute function public.preparar_rendimiento_medio();

create or replace function public.aplicar_rendimiento_a_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('mero.ajuste_saldo', '1', true);
  update public.medios set saldo = saldo + new.monto, updated_at = now() where id = new.medio_id;
  perform set_config('mero.ajuste_saldo', '', true);
  return new;
end;
$$;

create trigger trg_aplicar_rendimiento
  after insert on public.rendimientos
  for each row execute function public.aplicar_rendimiento_a_saldo();

create or replace function public.acreditar_rendimientos(
  p_hasta date default null,
  p_user  uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hasta    date := coalesce(p_hasta, (now() at time zone 'America/Bogota')::date - 1);
  m          record;
  d          date;
  v_saldo    numeric;
  v_base     numeric;
  v_monto    numeric;
  v_tasa_dia numeric;
  v_total    integer := 0;
  v_filas    integer;
begin
  perform set_config('mero.ajuste_rendimiento', '1', true);

  for m in
    select id, user_id, tasa_ea, rendimiento_hasta
      from public.medios
     where tasa_ea > 0
       and not _deleted
       and rendimiento_hasta is not null
       and rendimiento_hasta < v_hasta
       and (p_user is null or user_id = p_user)
     order by id
       for update
  loop
    v_tasa_dia := power(1 + m.tasa_ea / 100, 1.0 / 365) - 1;

    for d in
      select g::date from generate_series(m.rendimiento_hasta + 1, v_hasta, interval '1 day') g
    loop
      select saldo into v_saldo from public.medios where id = m.id;

      v_base := v_saldo
        - coalesce((select sum(case when mv.tipo = 'ingreso' then mv.monto else -mv.monto end)
                      from public.movimientos mv
                     where mv.medio_id = m.id and not mv._deleted and mv.fecha > d), 0)
        - coalesce((select sum(r.monto)
                      from public.rendimientos r
                     where r.medio_id = m.id and r.fecha > d), 0);

      if v_base > 0 then
        v_monto := round(v_base * v_tasa_dia, 2);
        if v_monto > 0 then
          insert into public.rendimientos (user_id, medio_id, fecha, saldo_base, tasa_ea, monto)
          values (m.user_id, m.id, d, v_base, m.tasa_ea, v_monto)
          on conflict (medio_id, fecha) do nothing;
          get diagnostics v_filas = row_count;
          v_total := v_total + v_filas;
        end if;
      end if;
    end loop;

    update public.medios set rendimiento_hasta = v_hasta where id = m.id;
  end loop;

  perform set_config('mero.ajuste_rendimiento', '', true);
  return v_total;
end;
$$;

revoke all on function public.acreditar_rendimientos(date, uuid) from public, anon, authenticated;

create or replace function public.acreditar_mis_rendimientos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión activa' using errcode = '28000';
  end if;
  return public.acreditar_rendimientos(null, auth.uid());
end;
$$;

revoke all on function public.acreditar_mis_rendimientos() from public, anon;
grant execute on function public.acreditar_mis_rendimientos() to authenticated;

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

  perform set_config('mero.ajuste_saldo', '1', true);
  update public.medios set saldo = saldo - v_total, updated_at = now() where id = p_medio;
  perform set_config('mero.ajuste_saldo', '', true);

  return v_total;
end;
$$;

revoke all on function public.reiniciar_rendimientos(uuid) from public, anon;
grant execute on function public.reiniciar_rendimientos(uuid) to authenticated;

create or replace function public.resumen_mensual(desde date, hasta date)
returns table (mes text, tipo text, categoria_id uuid, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select to_char(m.fecha, 'YYYY-MM'), m.tipo, m.categoria_id, sum(m.monto)
    from public.movimientos m
   where m.fecha >= desde
     and m.fecha <  hasta
     and m.categoria_id is not null
   group by 1, 2, 3
   order by 1, 2;
$$;

revoke all on function public.resumen_mensual(date, date) from public, anon;
grant execute on function public.resumen_mensual(date, date) to authenticated;

create or replace function public.meses_con_movimientos(desde date)
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select distinct to_char(fecha, 'YYYY-MM') as mes
    from public.movimientos
   where fecha >= desde
   order by mes desc;
$$;

revoke all on function public.meses_con_movimientos(date) from public, anon;
grant execute on function public.meses_con_movimientos(date) to authenticated;

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

select cron.schedule('rendimiento-diario', '5 5 * * *', $job$select public.acreditar_rendimientos()$job$);

-- 5) Guardas
do $$
declare c record; n record;
begin
  select * into c from _english_naming_revert_check;
  select
    (select count(*) from public.categorias)   as categories_n,
    (select count(*) from public.medios)       as boxes_n,
    (select count(*) from public.movimientos)  as transactions_n,
    (select count(*) from public.rendimientos) as yields_n,
    (select coalesce(sum(saldo), 0) from public.medios) as balance_sum
  into n;

  if n.categories_n <> c.categories_n or n.boxes_n <> c.boxes_n
     or n.transactions_n <> c.transactions_n or n.yields_n <> c.yields_n then
    raise exception 'revert: cambió el número de filas';
  end if;
  if n.balance_sum <> c.balance_sum then
    raise exception 'revert: cambió la suma de saldos (% antes, % después)', c.balance_sum, n.balance_sum;
  end if;
end $$;

commit;
