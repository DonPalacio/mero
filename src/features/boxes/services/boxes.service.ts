import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

const TABLA_MEDIOS = "medios";
// Solo las columnas que usa la app (no user_id, fechas ni columnas de sincronización).
const SELECT_MEDIOS = "id, nombre, saldo, color, icono";

export interface Medio {
  id: string;
  nombre: string;
  saldo: number;
  color: string | null;
  icono: string | null;
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
  }): Promise<ResultadoOperacion> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase
      .from(TABLA_MEDIOS)
      .insert([{ id: params.id, nombre: params.nombre, saldo: params.saldoInicial ?? 0 }]);

    if (error) {
      console.error("Error creando medio:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Nota: "saldo" no se edita aquí a propósito, lo ajusta el trigger de la BD
  // cada vez que se crea/edita/borra un movimiento asociado.
  actualizarMedio: async (
    id: string,
    cambios: Partial<Pick<Medio, "nombre" | "color" | "icono">>,
  ): Promise<ResultadoOperacion> => {
    const { error } = await supabase.from(TABLA_MEDIOS).update(cambios).eq("id", id);
    if (error) {
      console.error("Error actualizando medio:", error);
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
