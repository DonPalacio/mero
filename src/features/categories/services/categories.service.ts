import { supabase } from "@/lib/supabase";
import { failureReason, type OperationResult } from "@/lib/supabase-errors";

const CATEGORIES_TABLE = "categories";
// Solo las columnas que usa la app (no user_id, fechas ni columnas de sincronización).
const CATEGORY_COLUMNS = "id, name, type, monthly_budget, color, icon";

export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  monthly_budget: number;
  color: string | null;
  icon: string | null;
}

export const categoriesService = {
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .select(CATEGORY_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo categorías:", error);
      throw new Error(error.message);
    }
    return data || [];
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la categoría antes de que
  // responda la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  createCategory: async (params: {
    id: string;
    name: string;
    type: "expense" | "income";
  }): Promise<OperationResult> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase
      .from(CATEGORIES_TABLE)
      .insert([{ id: params.id, name: params.name, type: params.type, monthly_budget: 0 }]);

    if (error) {
      console.error("Error creando categoría:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  updateCategory: async (
    id: string,
    changes: Partial<Pick<Category, "name" | "type" | "color" | "icon">>,
  ): Promise<OperationResult> => {
    const { error } = await supabase.from(CATEGORIES_TABLE).update(changes).eq("id", id);
    if (error) {
      console.error("Error actualizando categoría:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  deleteCategory: async (id: string): Promise<OperationResult> => {
    const { error } = await supabase.from(CATEGORIES_TABLE).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando categoría:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },
};
