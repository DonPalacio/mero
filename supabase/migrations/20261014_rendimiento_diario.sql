-- ============================================================================
-- Mero · Migración: rendimiento diario por E.A. en las cajas (medios)
-- Spec: docs/specs/rendimiento-ea.md
--
-- Aditiva y no destructiva: añade columnas a `medios`, una tabla nueva
-- (`rendimientos`), funciones y un job diario. No toca datos, políticas ni
-- triggers existentes (medios.saldo sigue protegido por trg_proteger_saldo).
--
-- Idempotente. Ejecutar completa en el SQL Editor (primero en MERO DEV).
-- Requiere poder crear la extensión pg_cron (en Supabase también se puede
-- activar desde Database > Extensions antes de ejecutar este archivo).
--
-- Reversión (manual):
--   select cron.unschedule('rendimiento-diario');
--   drop table public.rendimientos;
--   drop function public.acreditar_mis_rendimientos(), public.acreditar_rendimientos(date, uuid);
--   drop trigger trg_preparar_rendimiento on public.medios;
--   alter table public.medios drop column tasa_ea, drop column rendimiento_desde,
--                             drop column rendimiento_hasta;
-- ============================================================================

begin;

-- 1) Columnas en medios -----------------------------------------------------------
--    tasa_ea           : % E.A. escrito por el usuario (null o 0 = sin rendimiento)
--    rendimiento_desde : primer día a acreditar, elegido al activar la tasa
--    rendimiento_hasta : último día ya acreditado (lo mantiene solo la BD)
alter table public.medios
  add column if not exists tasa_ea           numeric(6,3),
  add column if not exists rendimiento_desde date,
  add column if not exists rendimiento_hasta date;

alter table public.medios drop constraint if exists medios_tasa_ea_check;
alter table public.medios
  add constraint medios_tasa_ea_check check (tasa_ea is null or (tasa_ea >= 0 and tasa_ea <= 100));

-- 2) Historial de rendimientos ----------------------------------------------------
create table if not exists public.rendimientos (
  id         uuid        not null default gen_random_uuid(),
  user_id    uuid        not null default auth.uid(),
  medio_id   uuid        not null,
  fecha      date        not null,
  saldo_base numeric     not null,
  tasa_ea    numeric(6,3) not null,
  monto      numeric     not null,
  created_at timestamptz not null default now(),
  constraint rendimientos_pkey primary key (id),
  constraint rendimientos_monto_check check (monto > 0),
  constraint rendimientos_medio_fecha_key unique (medio_id, fecha),
  constraint rendimientos_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint rendimientos_medio_id_fkey
    foreign key (medio_id) references public.medios (id) on delete cascade
);

create index if not exists idx_rendimientos_user_fecha on public.rendimientos (user_id, fecha desc);

-- Solo lectura para el dueño: sin políticas ni permisos de escritura para el cliente.
alter table public.rendimientos enable row level security;

drop policy if exists select_own_rendimientos on public.rendimientos;
create policy select_own_rendimientos on public.rendimientos
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.rendimientos from anon;
revoke insert, update, delete, truncate on public.rendimientos from authenticated;

-- 3) Reglas de activación y protección de las columnas del rendimiento ---------------
--    - fecha de inicio no futura
--    - al activar la tasa: rendimiento_hasta = (inicio o hoy) - 1
--    - al desactivarla: se limpian rendimiento_desde y rendimiento_hasta
--    - con la tasa ya activa, el cliente no puede mover rendimiento_desde/hasta
--      (solo la función de acreditación, que marca la bandera mero.ajuste_rendimiento)
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
    new.rendimiento_hasta := coalesce(new.rendimiento_desde, hoy) - 1;
  else
    new.rendimiento_desde := old.rendimiento_desde;
    new.rendimiento_hasta := old.rendimiento_hasta;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_preparar_rendimiento on public.medios;
create trigger trg_preparar_rendimiento
  before insert or update on public.medios
  for each row execute function public.preparar_rendimiento_medio();

-- 4) Cada rendimiento suma al saldo (mismo patrón que actualizar_saldo_medio) -----------
create or replace function public.aplicar_rendimiento_a_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('mero.ajuste_saldo', '1', true);

  update public.medios
     set saldo = saldo + new.monto, updated_at = now()
   where id = new.medio_id;

  perform set_config('mero.ajuste_saldo', '', true);
  return new;
end;
$$;

drop trigger if exists trg_aplicar_rendimiento on public.rendimientos;
create trigger trg_aplicar_rendimiento
  after insert on public.rendimientos
  for each row execute function public.aplicar_rendimiento_a_saldo();

-- 5) Acreditación -------------------------------------------------------------------
--    p_hasta : último día a acreditar (por defecto, ayer en hora de Bogotá)
--    p_user  : null = todas las cajas (job diario); un id = solo las de ese usuario
--    Devuelve cuántos rendimientos insertó.
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
      -- Saldo actual (ya con los días anteriores acreditados en este mismo bucle) menos lo
      -- que entró o salió después de d: así se reconstruye el saldo al cierre de d.
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

-- Solo el job (rol postgres) puede acreditar a todos.
revoke all on function public.acreditar_rendimientos(date, uuid) from public, anon, authenticated;

-- Versión para el usuario autenticado: solo acredita sus propias cajas hasta ayer. Se llama
-- tras activar la tasa para ver al instante los días atrasados, sin esperar al job.
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

-- 6) Job diario: 05:05 UTC = 00:05 en Bogotá (UTC-5, sin horario de verano) -------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'rendimiento-diario';
select cron.schedule(
  'rendimiento-diario',
  '5 5 * * *',
  $job$select public.acreditar_rendimientos()$job$
);

commit;

-- ============================================================================
-- Verificación (ejecutar aparte tras el commit):
--
--   select jobname, schedule, active from cron.job where jobname = 'rendimiento-diario';
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'medios'
--      and column_name in ('tasa_ea','rendimiento_desde','rendimiento_hasta');   -- 3 filas
--   select nombre, saldo from public.medios order by nombre;   -- sin cambios
--
-- Estado del job: select * from cron.job_run_details order by start_time desc limit 5;
-- ============================================================================
