import { supabase } from "@/lib/supabase";

export interface MedioSaldo {
  id: string;
  name: string;
  saldo: number;
}

// Las lecturas (movimientos, categorías, medios) viven en src/lib/queries.ts,
// compartidas con las demás pantallas.
export const dashboardService = {
  // Actualizar el presupuesto mensual de una categoría
  async actualizarPresupuesto(id: string, presupuesto: number): Promise<boolean> {
    const { error } = await supabase
      .from("categorias")
      .update({ presupuesto_mensual: presupuesto })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando presupuesto:", error);
      return false;
    }
    return true;
  },
};