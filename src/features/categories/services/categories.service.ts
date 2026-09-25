import { supabase } from "@/lib/supabase";

const TABLA_CATEGORIAS = "categorias";

export interface Categoria {
  id: string;
  user_id: string;
  nombre: string;
  tipo: "gasto" | "ingreso";
  presupuesto_mensual: number;
  color: string | null;
  icono: string | null;
  created_at: string;
}

export const categoriesService = {
  obtenerCategorias: async (): Promise<Categoria[]> => {
    const { data, error } = await supabase
      .from(TABLA_CATEGORIAS)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo categorías:", error);
      return [];
    }
    return data || [];
  },

  crearCategoria: async (nombre: string, tipo: "gasto" | "ingreso"): Promise<Categoria | null> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { data, error } = await supabase
      .from(TABLA_CATEGORIAS)
      .insert([{ nombre, tipo, presupuesto_mensual: 0 }])
      .select()
      .single();

    if (error) {
      console.error("Error creando categoría:", error);
      return null;
    }
    return data;
  },

  actualizarCategoria: async (
    id: string,
    cambios: Partial<Pick<Categoria, "nombre" | "tipo" | "color" | "icono">>,
  ): Promise<boolean> => {
    const { error } = await supabase.from(TABLA_CATEGORIAS).update(cambios).eq("id", id);
    if (error) {
      console.error("Error actualizando categoría:", error);
      return false;
    }
    return true;
  },

  eliminarCategoria: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from(TABLA_CATEGORIAS).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando categoría:", error);
      return false;
    }
    return true;
  },
};
