-- ============================================================================
-- Mero · Esquema base (estado ANTES de la migración 20260925_sync_columns.sql)
-- Para montar un proyecto Supabase de DESARROLLO (mero-dev) desde cero.
-- Reconstruido a partir del esquema real de producción.
--
-- Orden en mero-dev:
--   1) este archivo (schema_base.sql)
--   2) supabase/migrations/20260925_sync_columns.sql
--
-- NO ejecutar en producción: ahí las tablas ya existen.
-- NOTA: este archivo conserva la nomenclatura ORIGINAL en español (estado histórico).
-- El estado actual (nombres en inglés) se obtiene aplicando todas las migraciones, en
-- particular supabase/migrations/20261018_english_naming.sql.
--
-- ============================================================================

-- 1) Tablas -----------------------------------------------------------------------

create table public.categorias (
  id                  uuid        not null default gen_random_uuid(),
  user_id             uuid        not null default auth.uid(),
  nombre              text        not null,
  presupuesto_mensual numeric     not null default 0,
  created_at          timestamptz not null default now(),
  tipo                text        not null default 'gasto',
  color               text,
  icono               text,
  constraint cajitas_pkey       primary key (id),
  constraint cajitas_tipo_check check (tipo = any (array['ingreso', 'gasto'])),
  constraint cajitas_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint cajitas_user_id_name_key unique (user_id, nombre)
);

create table public.medios (
  id         uuid        not null default gen_random_uuid(),
  user_id    uuid        not null,
  nombre     text        not null,
  created_at timestamptz          default now(),
  saldo      numeric     not null default 0,
  color      text,
  icono      text,
  updated_at timestamptz not null default now(),
  constraint medios_pkey primary key (id),
  constraint medios_user_id_fkey
    foreign key (user_id) references auth.users (id),
  constraint medios_user_id_name_key unique (user_id, nombre)
);

create table public.movimientos (
  id           uuid        not null default gen_random_uuid(),
  user_id      uuid        not null default auth.uid(),
  tipo         text        not null,
  monto        numeric     not null,
  fecha        date        not null,
  descripcion  text,
  created_at   timestamptz not null default now(),
  medio_id     uuid        not null,
  categoria_id uuid,
  constraint movimientos_pkey       primary key (id),
  constraint movimientos_tipo_check check (tipo = any (array['ingreso', 'gasto'])),
  constraint movimientos_monto_check check (monto > 0),
  constraint movimientos_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint movimientos_medio_id_fkey
    foreign key (medio_id) references public.medios (id) on delete cascade,
  constraint movimientos_categoria_id_fkey
    foreign key (categoria_id) references public.categorias (id) on delete set null
);

-- 2) Índices ------------------------------------------------------------------------

create index idx_categorias_user_id        on public.categorias  (user_id);
create index idx_medios_user_id            on public.medios      (user_id);
create index movimientos_user_fecha_idx    on public.movimientos (user_id, fecha desc);
create index idx_movimientos_categoria_id  on public.movimientos (categoria_id);
create index idx_movimientos_medio_id      on public.movimientos (medio_id);
create index idx_movimientos_user_id       on public.movimientos (user_id);
create index idx_movimientos_fecha         on public.movimientos (fecha);

-- 3) Row Level Security -------------------------------------------------------------

alter table public.categorias  enable row level security;
alter table public.medios      enable row level security;
alter table public.movimientos enable row level security;

-- categorias
create policy select_own_cajitas on public.categorias
  for select using (auth.uid() = user_id);
create policy insert_own_cajitas on public.categorias
  for insert with check (auth.uid() = user_id);
create policy update_own_cajitas on public.categorias
  for update using (auth.uid() = user_id);
create policy delete_own_cajitas on public.categorias
  for delete using (auth.uid() = user_id);

-- medios
create policy "usuarios ven sus medios" on public.medios
  for select using (auth.uid() = user_id);
create policy "usuarios insertan sus medios" on public.medios
  for insert with check (auth.uid() = user_id);
create policy "usuarios actualizan sus medios" on public.medios
  for update using (auth.uid() = user_id);
create policy "usuarios borran sus medios" on public.medios
  for delete using (auth.uid() = user_id);

-- movimientos
create policy select_own_movimientos on public.movimientos
  for select using (auth.uid() = user_id);
create policy insert_own_movimientos on public.movimientos
  for insert with check (auth.uid() = user_id);
create policy update_own_movimientos on public.movimientos
  for update using (auth.uid() = user_id);
create policy delete_own_movimientos on public.movimientos
  for delete using (auth.uid() = user_id);

-- 4) Trigger de saldo (versión original; la migración lo reemplaza) --------------------

create or replace function public.actualizar_saldo_medio()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update medios
    set saldo = saldo + (case when new.tipo = 'ingreso' then new.monto else -new.monto end),
        updated_at = now()
    where id = new.medio_id;
    return new;

  elsif (tg_op = 'UPDATE') then
    -- revertir el efecto del movimiento viejo
    update medios
    set saldo = saldo - (case when old.tipo = 'ingreso' then old.monto else -old.monto end)
    where id = old.medio_id;
    -- aplicar el efecto del movimiento nuevo
    update medios
    set saldo = saldo + (case when new.tipo = 'ingreso' then new.monto else -new.monto end),
        updated_at = now()
    where id = new.medio_id;
    return new;

  elsif (tg_op = 'DELETE') then
    update medios
    set saldo = saldo - (case when old.tipo = 'ingreso' then old.monto else -old.monto end),
        updated_at = now()
    where id = old.medio_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_actualizar_saldo_medio
  after insert or update or delete on public.movimientos
  for each row execute function public.actualizar_saldo_medio();

-- Verificación rápida:
--   select table_name from information_schema.tables
--    where table_schema = 'public' order by 1;   -- categorias, medios, movimientos
