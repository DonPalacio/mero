-- ============================================================================
-- Mero · Migración Fase 2: preparar la BD para sincronización (RxDB) y cookies
-- Idempotente y compatible con la app actual (no cambia el comportamiento de
-- los CRUD existentes). Ejecutar completo en el SQL Editor de la DB principal.
-- ============================================================================

begin;

-- 1) Columnas de sincronización ------------------------------------------------
--    _deleted  : borrado lógico (RxDB necesita saber qué se borró)
--    _modified : marca de tiempo para el checkpoint de pull (la mantiene un trigger)
alter table public.medios
  add column if not exists _deleted  boolean     not null default false,
  add column if not exists _modified timestamptz not null default now();

alter table public.categorias
  add column if not exists _deleted  boolean     not null default false,
  add column if not exists _modified timestamptz not null default now();

alter table public.movimientos
  add column if not exists _deleted  boolean     not null default false,
  add column if not exists _modified timestamptz not null default now();

-- 2) user_id por defecto en medios (ya lo tenían categorias y movimientos) -------
--    Permite que el cliente NO envíe user_id (con cookies HttpOnly ya no hay
--    supabase.auth.getUser() en el navegador). RLS sigue exigiendo auth.uid() = user_id.
alter table public.medios alter column user_id set default auth.uid();

-- 3) Trigger genérico que mantiene _modified -------------------------------------
create or replace function public.set_modified()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new._modified := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_set_modified on public.medios;
create trigger trg_set_modified
  before insert or update on public.medios
  for each row execute function public.set_modified();

drop trigger if exists trg_set_modified on public.categorias;
create trigger trg_set_modified
  before insert or update on public.categorias
  for each row execute function public.set_modified();

drop trigger if exists trg_set_modified on public.movimientos;
create trigger trg_set_modified
  before insert or update on public.movimientos
  for each row execute function public.set_modified();

-- 4) Índices para el pull incremental (user_id + checkpoint) ---------------------
create index if not exists idx_medios_sync      on public.medios      (user_id, _modified, id);
create index if not exists idx_categorias_sync  on public.categorias  (user_id, _modified, id);
create index if not exists idx_movimientos_sync on public.movimientos (user_id, _modified, id);

-- 5) Unicidad de nombre solo entre filas activas ---------------------------------
--    Con borrado lógico, una categoría/caja borrada no debe bloquear crear otra
--    con el mismo nombre.
alter table public.categorias drop constraint if exists cajitas_user_id_name_key;
create unique index if not exists categorias_user_nombre_activo_key
  on public.categorias (user_id, nombre) where not _deleted;

alter table public.medios drop constraint if exists medios_user_id_name_key;
create unique index if not exists medios_user_nombre_activo_key
  on public.medios (user_id, nombre) where not _deleted;

-- 6) Trigger de saldo: ahora entiende el borrado lógico -------------------------
--    Un movimiento con _deleted = true deja de contar en el saldo, y al
--    "restaurarlo" vuelve a contar. También marca una bandera de transacción
--    para que solo este trigger pueda modificar medios.saldo (ver punto 7).
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
    update medios
       set saldo = saldo + efecto_new, updated_at = now()
     where id = new.medio_id;

  elsif tg_op = 'DELETE' then
    update medios
       set saldo = saldo - efecto_old, updated_at = now()
     where id = old.medio_id;

  else -- UPDATE
    if old.medio_id = new.medio_id then
      update medios
         set saldo = saldo - efecto_old + efecto_new, updated_at = now()
       where id = new.medio_id;
    else
      update medios
         set saldo = saldo - efecto_old, updated_at = now()
       where id = old.medio_id;
      update medios
         set saldo = saldo + efecto_new, updated_at = now()
       where id = new.medio_id;
    end if;
  end if;

  perform set_config('mero.ajuste_saldo', '', true);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
-- (el trigger trg_actualizar_saldo_medio ya existe y apunta a esta función;
--  CREATE OR REPLACE FUNCTION basta. Se recrea abajo por si acaso.)
drop trigger if exists trg_actualizar_saldo_medio on public.movimientos;
create trigger trg_actualizar_saldo_medio
  after insert or update or delete on public.movimientos
  for each row execute function public.actualizar_saldo_medio();

-- 7) Proteger medios.saldo de escrituras directas --------------------------------
--    El cliente (y RxDB al hacer push) puede enviar un saldo viejo. Solo el
--    trigger de movimientos puede cambiarlo; cualquier otro UPDATE conserva el
--    saldo actual de la BD. (El saldo inicial al INSERT sí se respeta.)
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

drop trigger if exists trg_proteger_saldo on public.medios;
create trigger trg_proteger_saldo
  before update on public.medios
  for each row execute function public.proteger_saldo_medio();

-- 8) Realtime para las tres tablas ------------------------------------------------
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['medios', 'movimientos', 'categorias'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

-- ============================================================================
-- Verificación (ejecutar aparte tras el commit):
--
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public' and column_name in ('_deleted', '_modified')
--    order by 1, 2;                                   -- 6 filas
--
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime';             -- las 3 tablas
--
--   -- Los saldos no deben cambiar por esta migración:
--   select nombre, saldo from public.medios order by nombre;
-- ============================================================================
