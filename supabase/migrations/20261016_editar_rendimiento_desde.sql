-- ============================================================================
-- Mero · Migración: editar "Rinde desde" en una caja que ya rinde
-- Spec: docs/specs/rendimiento-ea.md (regla 4)
--
-- Cambios (sin tocar tablas ni datos de usuario salvo rellenar rendimiento_desde):
--   1) Al activar la tasa, rendimiento_desde queda siempre guardado (antes podía
--      quedar null = "hoy"), para poder mostrarlo al editar.
--   2) Con la tasa ya activa, mover rendimiento_desde HACIA ATRÁS reabre el rango:
--      el job acredita los días anteriores que faltaban. Los días ya acreditados no
--      se duplican (unique medio_id + fecha). Moverlo hacia adelante se ignora.
--   3) Rellena rendimiento_desde en cajas que ya rinden y lo tenían en null.
--
-- Idempotente (create or replace). Aplicar a mano en cada proyecto de Supabase,
-- después de 20261014_rendimiento_diario.sql.
-- ============================================================================

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
    -- Activación: el primer día a acreditar es el elegido (o hoy) y queda guardado.
    new.rendimiento_desde := coalesce(new.rendimiento_desde, hoy);
    new.rendimiento_hasta := new.rendimiento_desde - 1;

  elsif new.rendimiento_desde is not null
        and old.rendimiento_desde is not null
        and new.rendimiento_desde < old.rendimiento_desde then
    -- Ya rinde y el usuario movió el inicio hacia atrás: se reabre el rango para que el job
    -- acredite los días que faltan (los ya acreditados se saltan por la clave única).
    new.rendimiento_hasta := new.rendimiento_desde - 1;

  else
    -- Sin cambios de inicio, o hacia adelante (ya acreditado): se conserva lo que había.
    new.rendimiento_desde := old.rendimiento_desde;
    new.rendimiento_hasta := old.rendimiento_hasta;
  end if;

  return new;
end;
$$;

-- Relleno de cajas que ya rinden y no tenían la fecha de inicio guardada: el primer
-- rendimiento acreditado o, si aún no hay ninguno, el día siguiente al último procesado.
-- La bandera hace que el trigger anterior no deshaga el relleno.
do $$
begin
  perform set_config('mero.ajuste_rendimiento', '1', true);

  update public.medios m
     set rendimiento_desde = coalesce(
           (select min(r.fecha) from public.rendimientos r where r.medio_id = m.id),
           m.rendimiento_hasta + 1
         )
   where m.tasa_ea > 0
     and m.rendimiento_desde is null
     and m.rendimiento_hasta is not null;

  perform set_config('mero.ajuste_rendimiento', '', true);
end $$;
