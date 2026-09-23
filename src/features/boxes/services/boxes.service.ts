import { supabase } from "@/lib/supabase";

// El nombre de tu tabla en Supabase
const TABLA_MEDIOS = "medios";

export type TipoMedio = "efectivo" | "cuenta_bancaria" | "billetera_digital" | "tarjeta_credito";

export interface Medio {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoMedio;
  saldo: number;
  color: string | null;
  icono: string | null;
  created_at: string;
  updated_at: string;
}

export const boxesService = {
  obtenerMedios: async (): Promise<Medio[]> => {
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

  crearMedio: async (
    nombre: string,
    tipo: TipoMedio,
    saldoInicial: number = 0,
  ): Promise<Medio | null> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Error obteniendo usuario autenticado:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from(TABLA_MEDIOS)
      .insert([{ nombre, tipo, saldo: saldoInicial, user_id: userData.user.id }])
      .select()
      .single();

    if (error) {
      console.error("Error creando medio:", error);
      return null;
    }
    return data;
  },

  // Nota: "saldo" no se edita aquí a propósito, lo ajusta el trigger de la BD
  // cada vez que se crea/edita/borra un movimiento asociado.
  actualizarMedio: async (
    id: string,
    cambios: Partial<Pick<Medio, "nombre" | "tipo" | "color" | "icono">>,
  ): Promise<boolean> => {
    const { error } = await supabase.from(TABLA_MEDIOS).update(cambios).eq("id", id);
    if (error) {
      console.error("Error actualizando medio:", error);
      return false;
    }
    return true;
  },

  eliminarMedio: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from(TABLA_MEDIOS).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando medio:", error);
      return false;
    }
    return true;
  },
};
