import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

const TABLA_MEDIOS = "medios";
// Solo las columnas que usa la app (no user_id, fechas ni columnas de sincronización).
const SELECT_MEDIOS = "id, nombre, saldo, color, icono, tasa_ea, rendimiento_desde";

export interface Medio {
  id: string;
  nombre: string;
  saldo: number;
  color: string | null;
  icono: string | null;
  // % E.A. escrito por el usuario; null = la caja no rinde (ver docs/specs/rendimiento-ea.md).
  tasa_ea: number | null;
  // Primer día que rinde ("YYYY-MM-DD"); null si la caja no rinde. Lo fija la BD.
  rendimiento_desde: string | null;
}

export const boxesService = {
  obtenerMedios: async (): Promise<Medio[]> => {
    const { data, error } = await supabase
      .from(TABLA_MEDIOS)
      .select(SELECT_MEDIOS)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo medios:", error);
      throw new Error(error.message);
    }
    return data || [];
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la caja antes de que responda
  // la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  crearMedio: async (params: {
    id: string;
    nombre: string;
    saldoInicial?: number;
    // % E.A. opcional: la BD fija desde cuándo rinde (el día de la creación).
    tasaEa?: number | null;
  }): Promise<ResultadoOperacion> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase.from(TABLA_MEDIOS).insert([
      {
        id: params.id,
        nombre: params.nombre,
        saldo: params.saldoInicial ?? 0,
        ...(params.tasaEa != null ? { tasa_ea: params.tasaEa } : {}),
      },
    ]);

    if (error) {
      console.error("Error creando medio:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Nota: "saldo" no se edita aquí a propósito, lo ajusta el trigger de la BD
  // cada vez que se crea/edita/borra un movimiento asociado o se acredita un rendimiento.
  // `rendimiento_desde` solo se envía al activar la tasa: la BD ignora cambiarlo después.
  actualizarMedio: async (
    id: string,
    cambios: Partial<Pick<Medio, "nombre" | "color" | "icono" | "tasa_ea">> & {
      rendimiento_desde?: string | null;
    },
  ): Promise<ResultadoOperacion> => {
    const { error } = await supabase.from(TABLA_MEDIOS).update(cambios).eq("id", id);
    if (error) {
      console.error("Error actualizando medio:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Acredita ya los rendimientos atrasados de las cajas del usuario (la BD solo toca las
  // suyas). El job diario lo hace igual cada noche; esto evita esperar tras activar la tasa.
  acreditarMisRendimientos: async (): Promise<ResultadoOperacion> => {
    const { error } = await supabase.rpc("acreditar_mis_rendimientos");
    if (error) {
      console.error("Error acreditando rendimientos:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Borra los rendimientos acumulados de la caja y los resta de su saldo (la BD lo hace en
  // una sola transacción y solo sobre cajas del usuario). La tasa se conserva.
  reiniciarRendimientos: async (id: string): Promise<ResultadoOperacion> => {
    const { error } = await supabase.rpc("reiniciar_rendimientos", { p_medio: id });
    if (error) {
      console.error("Error reiniciando rendimientos:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  eliminarMedio: async (id: string): Promise<ResultadoOperacion> => {
    const { error } = await supabase.from(TABLA_MEDIOS).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando medio:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },
};
