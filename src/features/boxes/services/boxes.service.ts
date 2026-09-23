import { createClient } from "@supabase/supabase-js";

// Inicializamos el cliente de Supabase (Asegúrate de tener estas variables en tu archivo .env)
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "";
const supabaseKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "";
export const supabase = createClient(supabaseUrl, supabaseKey);

// El nombre de tu tabla en Supabase (ajústalo si en tu BD se llama diferente, ej: 'cajas')
const TABLA_MEDIOS = "medios";

export const boxesService = {
  obtenerMedios: async () => {
    const { data, error } = await supabase
      .from(TABLA_MEDIOS)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo medios:", error);
      return [];
    }
    return data || [];
  },

  crearMedio: async (name: string) => {
    const { data, error } = await supabase.from(TABLA_MEDIOS).insert([{ name }]).select().single();
    if (error) {
      console.error("Error creando medio:", error);
      return null;
    }
    return data; // Devuelve el registro creado con su ID real
  },

  actualizarMedio: async (oldName: string, newName: string) => {
    // Buscamos por nombre antiguo y lo actualizamos al nuevo
    const { error } = await supabase
      .from(TABLA_MEDIOS)
      .update({ name: newName })
      .eq("name", oldName);
    if (error) {
      console.error("Error actualizando medio:", error);
      return false;
    }
    return true;
  },

  eliminarMedio: async (name: string) => {
    const { error } = await supabase.from(TABLA_MEDIOS).delete().eq("name", name);
    if (error) {
      console.error("Error eliminando medio:", error);
      return false;
    }
    return true;
  },
};
