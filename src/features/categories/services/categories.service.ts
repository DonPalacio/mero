import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

const TABLA_CATEGORIAS = "categorias";
// Solo las columnas que usa la app (no user_id, fechas ni columnas de sincronización).
const SELECT_CATEGORIAS = "id, nombre, tipo, presupuesto_mensual, color, icono";

export interface Categoria {
  id: string;
  nombre: string;
  tipo: "gasto" | "ingreso";
  presupuesto_mensual: number;
  color: string | null;
  icono: string | null;
}

export const categoriesService = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const { data, error } = await supabase
      .from(TABLA_CATEGORIAS)
      .select(SELECT_CATEGORIAS)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo categorías:", error);
      throw new Error(error.message);
    }
    return data || [];
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la categoría antes de que
  // responda la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  crearCategoria: async (params: {
    id: string;
    nombre: string;
    tipo: "gasto" | "ingreso";
  }): Promise<ResultadoOperacion> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase
      .from(TABLA_CATEGORIAS)
      .insert([
        { id: params.id, nombre: params.nombre, tipo: params.tipo, presupuesto_mensual: 0 },
      ]);

    if (error) {
      console.error("Error creando categoría:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  actualizarCategoria: async (
    id: string,
    cambios: Partial<Pick<Categoria, "nombre" | "tipo" | "color" | "icono">>,
  ): Promise<ResultadoOperacion> => {
    const { error } = await supabase.from(TABLA_CATEGORIAS).update(cambios).eq("id", id);
    if (error) {
      console.error("Error actualizando categoría:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  eliminarCategoria: async (id: string): Promise<ResultadoOperacion> => {
    const { error } = await supabase.from(TABLA_CATEGORIAS).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando categoría:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },
};
