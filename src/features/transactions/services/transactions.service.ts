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

export const transactionsService = {
  // Trae los movimientos con los nombres de medio/categoría ya resueltos (join)
  async obtenerMovimientos(): Promise<MovimientoDB[]> {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*, medios(nombre), categorias(nombre)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo movimientos:", error);
      throw new Error(error.message);
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

  async crearMovimiento(params: {
    tipo: "gasto" | "ingreso";
    monto: number;
    medioId: string;
    categoriaId?: string | null;
    fecha: string;
    nota: string;
  }): Promise<{ id: string } | null> {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { data, error } = await supabase
      .from("movimientos")
      .insert([
        {
          tipo: params.tipo,
          monto: params.monto,
          medio_id: params.medioId,
          categoria_id: params.categoriaId ?? null,
          fecha: params.fecha,
          descripcion: params.nota || null,
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
