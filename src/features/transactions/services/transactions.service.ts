import { supabase } from "@/lib/supabase";

export interface MovimientoDB {
  id: string;
  tipo: "gasto" | "ingreso";
  monto: number;
  cajita: string; // nombre de la categoría
  medio: string; // nombre del medio
  fecha: string;
  nota: string;
}

export interface MedioOption {
  id: string;
  nombre: string;
}

export interface CategoriaOption {
  id: string;
  nombre: string;
  tipo: "gasto" | "ingreso";
}

export const transactionsService = {
  // Trae los movimientos con los nombres de medio/categoría ya resueltos (join)
  async obtenerMovimientos(): Promise<MovimientoDB[]> {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*, medios(nombre), categorias(nombre)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo movimientos:", error);
      return [];
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      tipo: m.tipo,
      monto: Number(m.monto),
      cajita: m.categorias?.nombre ?? "",
      medio: m.medios?.nombre ?? "",
      fecha: m.fecha,
      nota: m.descripcion || "",
    }));
  },

  async obtenerMedios(): Promise<MedioOption[]> {
    const { data, error } = await supabase
      .from("medios")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error obteniendo medios:", error);
      return [];
    }
    return data || [];
  },

  async obtenerCategorias(): Promise<CategoriaOption[]> {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre, tipo")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error obteniendo categorías:", error);
      return [];
    }
    return data || [];
  },

  async crearMovimiento(params: {
    tipo: "gasto" | "ingreso";
    monto: number;
    medioId: string;
    categoriaId: string;
    fecha: string;
    nota: string;
  }): Promise<{ id: string } | null> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Error obteniendo usuario autenticado:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("movimientos")
      .insert([
        {
          tipo: params.tipo,
          monto: params.monto,
          medio_id: params.medioId,
          categoria_id: params.categoriaId,
          fecha: params.fecha,
          descripcion: params.nota || null,
          user_id: userData.user.id,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error creando movimiento:", error);
      return null;
    }
    return data;
  },

  async eliminarMovimiento(id: string): Promise<boolean> {
    const { error } = await supabase.from("movimientos").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando movimiento:", error);
      return false;
    }
    return true;
  },
};
