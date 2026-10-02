import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

export interface MedioSaldo {
  id: string;
  name: string;
  saldo: number;
}

// Las lecturas (movimientos, categorías, medios) viven en src/lib/queries.ts,
// compartidas con las demás pantallas.
export const dashboardService = {
  // Actualizar el presupuesto mensual de una categoría. Devuelve el motivo del fallo para que
  // quien llama pueda avisar con precisión.
  async actualizarPresupuesto(id: string, presupuesto: number): Promise<ResultadoOperacion> {
    const { error } = await supabase
      .from("categorias")
      .update({ presupuesto_mensual: presupuesto })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando presupuesto:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },
};
