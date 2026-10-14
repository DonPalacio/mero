-- ============================================================================
-- Mero · Migración: nomenclatura en inglés (tablas, columnas, funciones, datos)
--
-- Renombra todo identificador de la BD al inglés y pasa los valores de `tipo`
-- ('ingreso'/'gasto') a `type` ('income'/'expense'). Los textos de error que ve el
-- usuario siguen en español.
--
--   tablas      categorias→categories  medios→boxes  movimientos→transactions
--               rendimientos→yields
--   columnas    nombre→name  icono→icon  tipo→type  saldo→balance  monto→amount
--               fecha→date  descripcion→description  medio_id→box_id
--               categoria_id→category_id  presupuesto_mensual→monthly_budget
--               tasa_ea→ea_rate  rendimiento_desde→yield_from
--               rendimiento_hasta→yield_until  saldo_base→base_balance
--   funciones   actualizar_saldo_medio→update_box_balance
--               proteger_saldo_medio→protect_box_balance
--               preparar_rendimiento_medio→prepare_box_yield
--               aplicar_rendimiento_a_saldo→apply_yield_to_balance
--               acreditar_rendimientos→credit_yields
--               acreditar_mis_rendimientos→credit_my_yields
--               reiniciar_rendimientos→reset_yields
--               resumen_mensual→monthly_summary
--               meses_con_movimientos→months_with_transactions
--               rendimientos_mensuales→monthly_yields
--   banderas    mero.ajuste_saldo→mero.balance_adjustment
--               mero.ajuste_rendimiento→mero.yield_adjustment
--   cron        rendimiento-diario→daily-yield
--
-- Orden de aplicación: después de 20261017. La app y la BD deben cambiar JUNTAS: la
-- versión anterior de la app deja de funcionar al aplicarla (ventana de corte corta:
-- aplicar esta migración y hacer el merge a main seguidos).
--
-- Todo va en una transacción. Al final, un bloque de guardas compara conteos y
-- saldos contra una foto tomada al inicio; si algo no coincide, aborta y no queda
-- nada aplicado.
--
-- Reversión: supabase/rollback/20261018_english_naming_revert.sql (solo emergencia).
-- ============================================================================

begin;

-- 0) Foto del estado antes de tocar nada --------------------------------------------
create temp table _english_naming_check on commit drop as
select
  (select count(*) from public.categorias)  as categories_n,
  (select count(*) from public.medios)      as boxes_n,
  (select count(*) from public.movimientos) as transactions_n,
  (select count(*) from public.rendimientos) as yields_n,
  (select coalesce(sum(saldo), 0) from public.medios) as balance_sum,
  (select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0)
     from public.movimientos) as net_sum,
  (select count(*) from public.movimientos where tipo = 'ingreso') as income_n,
  (select count(*) from public.categorias where tipo = 'ingreso')  as income_categories_n;

-- 1) Tablas ---------------------------------------------------------------------------
alter table public.categorias   rename to categories;
alter table public.medios       rename to boxes;
alter table public.movimientos  rename to transactions;
alter table public.rendimientos rename to yields;

-- 2) Columnas -------------------------------------------------------------------------
alter table public.categories rename column nombre to name;
alter table public.categories rename column icono to icon;
alter table public.categories rename column tipo to type;
alter table public.categories rename column presupuesto_mensual to monthly_budget;

alter table public.boxes rename column nombre to name;
alter table public.boxes rename column icono to icon;
alter table public.boxes rename column saldo to balance;
alter table public.boxes rename column tasa_ea to ea_rate;
alter table public.boxes rename column rendimiento_desde to yield_from;
alter table public.boxes rename column rendimiento_hasta to yield_until;

alter table public.transactions rename column tipo to type;
alter table public.transactions rename column monto to amount;
alter table public.transactions rename column fecha to date;
alter table public.transactions rename column descripcion to description;
alter table public.transactions rename column medio_id to box_id;
alter table public.transactions rename column categoria_id to category_id;

alter table public.yields rename column medio_id to box_id;
alter table public.yields rename column fecha to date;
alter table public.yields rename column saldo_base to base_balance;
alter table public.yields rename column tasa_ea to ea_rate;
alter table public.yields rename column monto to amount;

-- 3) Constraints (la PK/UNIQUE renombra también su índice) ---------------------------
alter table public.categories   rename constraint cajitas_pkey                    to categories_pkey;
alter table public.categories   rename constraint cajitas_user_id_fkey            to categories_user_id_fkey;

alter table public.boxes        rename constraint medios_pkey                     to boxes_pkey;
alter table public.boxes        rename constraint medios_tasa_ea_check            to boxes_ea_rate_check;
alter table public.boxes        rename constraint medios_user_id_fkey             to boxes_user_id_fkey;

alter table public.transactions rename constraint movimientos_pkey                to transactions_pkey;
alter table public.transactions rename constraint movimientos_monto_check         to transactions_amount_check;
alter table public.transactions rename constraint movimientos_user_id_fkey        to transactions_user_id_fkey;
alter table public.transactions rename constraint movimientos_medio_id_fkey       to transactions_box_id_fkey;
alter table public.transactions rename constraint movimientos_categoria_id_fkey   to transactions_category_id_fkey;

alter table public.yields       rename constraint rendimientos_pkey               to yields_pkey;
alter table public.yields       rename constraint rendimientos_monto_check        to yields_amount_check;
alter table public.yields       rename constraint rendimientos_medio_fecha_key    to yields_box_date_key;
alter table public.yields       rename constraint rendimientos_user_id_fkey       to yields_user_id_fkey;
alter table public.yields       rename constraint rendimientos_medio_id_fkey      to yields_box_id_fkey;

-- 4) Índices (los que no respaldan una constraint) -----------------------------------
alter index public.categorias_user_nombre_activo_key rename to categories_user_name_active_key;
alter index public.idx_categorias_sync               rename to idx_categories_sync;
alter index public.idx_categorias_user_id            rename to idx_categories_user_id;

alter index public.medios_user_nombre_activo_key     rename to boxes_user_name_active_key;
alter index public.idx_medios_sync                   rename to idx_boxes_sync;
alter index public.idx_medios_user_id                rename to idx_boxes_user_id;

alter index public.idx_movimientos_categoria_id      rename to idx_transactions_category_id;
alter index public.idx_movimientos_fecha             rename to idx_transactions_date;
alter index public.idx_movimientos_medio_id          rename to idx_transactions_box_id;
alter index public.idx_movimientos_sync              rename to idx_transactions_sync;
alter index public.idx_movimientos_user_id           rename to idx_transactions_user_id;
alter index public.movimientos_user_fecha_idx        rename to transactions_user_date_idx;

alter index public.idx_rendimientos_user_fecha       rename to idx_yields_user_date;

-- 5) Políticas RLS (solo cambia el nombre; la expresión sigue a la columna) ----------
alter policy select_own_cajitas on public.categories rename to select_own_categories;
alter policy insert_own_cajitas on public.categories rename to insert_own_categories;
alter policy update_own_cajitas on public.categories rename to update_own_categories;
alter policy delete_own_cajitas on public.categories rename to delete_own_categories;

alter policy "usuarios ven sus medios"        on public.boxes rename to select_own_boxes;
alter policy "usuarios insertan sus medios"   on public.boxes rename to insert_own_boxes;
alter policy "usuarios actualizan sus medios" on public.boxes rename to update_own_boxes;
alter policy "usuarios borran sus medios"     on public.boxes rename to delete_own_boxes;

alter policy select_own_movimientos on public.transactions rename to select_own_transactions;
alter policy insert_own_movimientos on public.transactions rename to insert_own_transactions;
alter policy update_own_movimientos on public.transactions rename to update_own_transactions;
alter policy delete_own_movimientos on public.transactions rename to delete_own_transactions;

alter policy select_own_rendimientos on public.yields rename to select_own_yields;

-- 6) Triggers y funciones -------------------------------------------------------------
--    Los triggers apuntan a la función por OID, y el cuerpo de plpgsql guarda texto
--    con los nombres viejos: se sueltan los triggers, se crean las funciones nuevas,
--    se vuelven a crear los triggers y al final se borran las funciones viejas.
drop trigger if exists trg_actualizar_saldo_medio on public.transactions;
drop trigger if exists trg_proteger_saldo         on public.boxes;
drop trigger if exists trg_preparar_rendimiento   on public.boxes;
drop trigger if exists trg_aplicar_rendimiento    on public.yields;

-- 6.1) Saldo de la caja a partir de los movimientos
create or replace function public.update_box_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_effect numeric := 0;
  new_effect numeric := 0;
begin
  perform set_config('mero.balance_adjustment', '1', true);

  if tg_op in ('UPDATE', 'DELETE') and not old._deleted then
    old_effect := case when old.type = 'income' then old.amount else -old.amount end;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and not new._deleted then
    new_effect := case when new.type = 'income' then new.amount else -new.amount end;
  end if;

  if tg_op = 'INSERT' then
    update public.boxes
       set balance = balance + new_effect, updated_at = now()
     where id = new.box_id;

  elsif tg_op = 'DELETE' then
    update public.boxes
       set balance = balance - old_effect, updated_at = now()
     where id = old.box_id;

  else -- UPDATE
    if old.box_id = new.box_id then
      update public.boxes
         set balance = balance - old_effect + new_effect, updated_at = now()
       where id = new.box_id;
    else
      update public.boxes
         set balance = balance - old_effect, updated_at = now()
       where id = old.box_id;
      update public.boxes
         set balance = balance + new_effect, updated_at = now()
       where id = new.box_id;
    end if;
  end if;

  perform set_config('mero.balance_adjustment', '', true);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_update_box_balance
  after insert or update or delete on public.transactions
  for each row execute function public.update_box_balance();

-- 6.2) Protege boxes.balance de escrituras directas
create or replace function public.protect_box_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('mero.balance_adjustment', true), '') <> '1' then
    new.balance := old.balance;
  end if;
  return new;
end;
$$;

create trigger trg_protect_balance
  before update on public.boxes
  for each row execute function public.protect_box_balance();

-- 6.3) Reglas de activación / fecha de inicio del E.A. (ver docs/specs/rendimiento-ea.md)
create or replace function public.prepare_box_yield()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Bogota')::date;
begin
  -- La función de acreditación ajusta yield_until sin pasar por estas reglas.
  if coalesce(current_setting('mero.yield_adjustment', true), '') = '1' then
    return new;
  end if;

  if new.yield_from is not null and new.yield_from > today then
    raise exception 'La fecha de inicio del rendimiento no puede ser futura'
      using errcode = '22023';
  end if;

  if coalesce(new.ea_rate, 0) = 0 then
    new.yield_from  := null;
    new.yield_until := null;

  elsif tg_op = 'INSERT' or coalesce(old.ea_rate, 0) = 0 then
    new.yield_from  := coalesce(new.yield_from, today);
    new.yield_until := new.yield_from - 1;

  elsif new.yield_from is not null
        and old.yield_from is not null
        and new.yield_from < old.yield_from then
    new.yield_until := new.yield_from - 1;

  else
    new.yield_from  := old.yield_from;
    new.yield_until := old.yield_until;
  end if;

  return new;
end;
$$;

create trigger trg_prepare_yield
  before insert or update on public.boxes
  for each row execute function public.prepare_box_yield();

-- 6.4) Cada rendimiento acreditado suma a la caja
create or replace function public.apply_yield_to_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('mero.balance_adjustment', '1', true);

  update public.boxes
     set balance = balance + new.amount, updated_at = now()
   where id = new.box_id;

  perform set_config('mero.balance_adjustment', '', true);
  return new;
end;
$$;

create trigger trg_apply_yield
  after insert on public.yields
  for each row execute function public.apply_yield_to_balance();

-- 6.5) Acreditación diaria (cron) y por usuario
create or replace function public.credit_yields(
  p_until date default null,
  p_user  uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until      date := coalesce(p_until, (now() at time zone 'America/Bogota')::date - 1);
  b            record;
  d            date;
  v_balance    numeric;
  v_base       numeric;
  v_amount     numeric;
  v_daily_rate numeric;
  v_total      integer := 0;
  v_rows       integer;
begin
  perform set_config('mero.yield_adjustment', '1', true);

  for b in
    select id, user_id, ea_rate, yield_until
      from public.boxes
     where ea_rate > 0
       and not _deleted
       and yield_until is not null
       and yield_until < v_until
       and (p_user is null or user_id = p_user)
     order by id
       for update
  loop
    v_daily_rate := power(1 + b.ea_rate / 100, 1.0 / 365) - 1;

    for d in
      select g::date from generate_series(b.yield_until + 1, v_until, interval '1 day') g
    loop
      select balance into v_balance from public.boxes where id = b.id;

      -- Saldo al cierre del día d: el actual menos lo ocurrido después.
      v_base := v_balance
        - coalesce((select sum(case when t.type = 'income' then t.amount else -t.amount end)
                      from public.transactions t
                     where t.box_id = b.id and not t._deleted and t.date > d), 0)
        - coalesce((select sum(y.amount)
                      from public.yields y
                     where y.box_id = b.id and y.date > d), 0);

      if v_base > 0 then
        v_amount := round(v_base * v_daily_rate, 2);
        if v_amount > 0 then
          insert into public.yields (user_id, box_id, date, base_balance, ea_rate, amount)
          values (b.user_id, b.id, d, v_base, b.ea_rate, v_amount)
          on conflict (box_id, date) do nothing;
          get diagnostics v_rows = row_count;
          v_total := v_total + v_rows;
        end if;
      end if;
    end loop;

    update public.boxes set yield_until = v_until where id = b.id;
  end loop;

  perform set_config('mero.yield_adjustment', '', true);
  return v_total;
end;
$$;

revoke all on function public.credit_yields(date, uuid) from public, anon, authenticated;

create or replace function public.credit_my_yields()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión activa' using errcode = '28000';
  end if;
  return public.credit_yields(null, auth.uid());
end;
$$;

revoke all on function public.credit_my_yields() from public, anon;
grant execute on function public.credit_my_yields() to authenticated;

-- 6.6) Reinicio del dinero generado por E.A. de una caja
create or replace function public.reset_yields(p_box uuid)
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

  perform 1 from public.boxes where id = p_box and user_id = v_user for update;
  if not found then
    raise exception 'Caja no encontrada' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0) into v_total
    from public.yields
   where box_id = p_box and user_id = v_user;

  if v_total = 0 then
    return 0;
  end if;

  delete from public.yields where box_id = p_box and user_id = v_user;

  perform set_config('mero.balance_adjustment', '1', true);
  update public.boxes
     set balance = balance - v_total, updated_at = now()
   where id = p_box;
  perform set_config('mero.balance_adjustment', '', true);

  return v_total;
end;
$$;

revoke all on function public.reset_yields(uuid) from public, anon;
grant execute on function public.reset_yields(uuid) to authenticated;

-- 6.7) RPC de lectura (security invoker: RLS limita a las filas del usuario)
create or replace function public.monthly_summary(from_date date, until_date date)
returns table (month text, type text, category_id uuid, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select to_char(t.date, 'YYYY-MM'), t.type, t.category_id, sum(t.amount)
    from public.transactions t
   where t.date >= from_date
     and t.date <  until_date
     and t.category_id is not null
   group by 1, 2, 3
   order by 1, 2;
$$;

revoke all on function public.monthly_summary(date, date) from public, anon;
grant execute on function public.monthly_summary(date, date) to authenticated;

create or replace function public.months_with_transactions(from_date date)
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select distinct to_char(t.date, 'YYYY-MM') as month
    from public.transactions t
   where t.date >= from_date
   order by month desc;
$$;

revoke all on function public.months_with_transactions(date) from public, anon;
grant execute on function public.months_with_transactions(date) to authenticated;

create or replace function public.monthly_yields(from_date date, until_date date)
returns table (month text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select to_char(y.date, 'YYYY-MM'), sum(y.amount)
    from public.yields y
   where y.date >= from_date
     and y.date <  until_date
   group by 1
   order by 1;
$$;

revoke all on function public.monthly_yields(date, date) from public, anon;
grant execute on function public.monthly_yields(date, date) to authenticated;

-- 6.8) Cron: se reprograma con la función nueva y recién entonces se borran las viejas
select cron.unschedule(jobid) from cron.job where jobname in ('rendimiento-diario', 'daily-yield');
select cron.schedule('daily-yield', '5 5 * * *', $job$select public.credit_yields()$job$);

drop function public.actualizar_saldo_medio();
drop function public.proteger_saldo_medio();
drop function public.preparar_rendimiento_medio();
drop function public.aplicar_rendimiento_a_saldo();
drop function public.acreditar_rendimientos(date, uuid);
drop function public.acreditar_mis_rendimientos();
drop function public.reiniciar_rendimientos(uuid);
drop function public.resumen_mensual(date, date);
drop function public.meses_con_movimientos(date);
drop function public.rendimientos_mensuales(date, date);

-- 7) Datos: 'ingreso'/'gasto' → 'income'/'expense' ------------------------------------
--    El trigger de saldo se desactiva: ya entiende 'income', y re-evaluar el UPDATE
--    como "revertir viejo + aplicar nuevo" restaría el monto de los ingresos antiguos.
--    Los saldos no deben cambiar: lo comprueba la guarda final.
alter table public.categories   drop constraint cajitas_tipo_check;
alter table public.transactions drop constraint movimientos_tipo_check;

alter table public.transactions disable trigger trg_update_box_balance;

update public.transactions
   set type = case type when 'ingreso' then 'income' when 'gasto' then 'expense' else type end
 where type in ('ingreso', 'gasto');

update public.categories
   set type = case type when 'ingreso' then 'income' when 'gasto' then 'expense' else type end
 where type in ('ingreso', 'gasto');

alter table public.transactions enable trigger trg_update_box_balance;

alter table public.categories
  add constraint categories_type_check check (type = any (array['income', 'expense']));
alter table public.categories alter column type set default 'expense';

alter table public.transactions
  add constraint transactions_type_check check (type = any (array['income', 'expense']));

-- 8) Guardas: nada se perdió ni cambió de saldo --------------------------------------
do $$
declare
  c record;
  n record;
begin
  select * into c from _english_naming_check;

  select
    (select count(*) from public.categories)   as categories_n,
    (select count(*) from public.boxes)        as boxes_n,
    (select count(*) from public.transactions) as transactions_n,
    (select count(*) from public.yields)       as yields_n,
    (select coalesce(sum(balance), 0) from public.boxes) as balance_sum,
    (select coalesce(sum(case when type = 'income' then amount else -amount end), 0)
       from public.transactions) as net_sum,
    (select count(*) from public.transactions where type = 'income') as income_n,
    (select count(*) from public.categories where type = 'income')   as income_categories_n
  into n;

  if n.categories_n <> c.categories_n or n.boxes_n <> c.boxes_n
     or n.transactions_n <> c.transactions_n or n.yields_n <> c.yields_n then
    raise exception 'english_naming: cambió el número de filas (%/% categorías, %/% cajas, %/% movimientos, %/% rendimientos)',
      n.categories_n, c.categories_n, n.boxes_n, c.boxes_n,
      n.transactions_n, c.transactions_n, n.yields_n, c.yields_n;
  end if;

  if n.balance_sum <> c.balance_sum then
    raise exception 'english_naming: cambió la suma de saldos (% antes, % después)',
      c.balance_sum, n.balance_sum;
  end if;

  if n.net_sum <> c.net_sum or n.income_n <> c.income_n
     or n.income_categories_n <> c.income_categories_n then
    raise exception 'english_naming: cambiaron los tipos o el neto de movimientos';
  end if;

  if exists (select 1 from public.transactions where type not in ('income', 'expense'))
     or exists (select 1 from public.categories where type not in ('income', 'expense')) then
    raise exception 'english_naming: quedaron valores de type fuera de income/expense';
  end if;
end $$;

commit;

-- ============================================================================
-- Verificación (ejecutar aparte tras el commit):
--
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public' order by 1, 2;     -- solo nombres en inglés
--
--   select proname from pg_proc where pronamespace = 'public'::regnamespace order by 1;
--   select jobname, schedule, command from cron.job;  -- daily-yield | 5 5 * * * | credit_yields
--   select name, balance from public.boxes order by name;   -- mismos saldos que antes
-- ============================================================================
