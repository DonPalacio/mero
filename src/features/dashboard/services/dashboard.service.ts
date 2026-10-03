import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

export interface MedioSaldo {
  id: string;
  name: string;
  saldo: number;
}

// Total de movimientos de un mes, tipo y categoría (los que tienen categoría).
export interface ResumenFila {
  mes: string; // "YYYY-MM"
  tipo: "gasto" | "ingreso";
  categoriaId: string;
  total: number;
}

// Forma de la fila que devuelve la función SQL resumen_mensual.
interface ResumenFilaDB {
  mes: string;
  tipo: "gasto" | "ingreso";
  categoria_id: string;
  total: number | string;
}

// Las lecturas (movimientos, categorías, medios) viven en src/lib/queries.ts,
// compartidas con las demás pantallas.
export const dashboardService = {
  // Totales por mes, tipo y categoría en [desde, hasta) ("YYYY-MM-DD"). Los suma la función
  // SQL resumen_mensual (con RLS): así el dashboard no descarga todos los movimientos.
  async obtenerResumenMensual(desde: string, hasta: string): Promise<ResumenFila[]> {
    const { data, error } = await supabase.rpc("resumen_mensual", { desde, hasta });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo el resumen mensual:", error);
      throw new Error(error.message);
    }

    return ((data ?? []) as ResumenFilaDB[]).map((f) => ({
      mes: f.mes,
      tipo: f.tipo,
      categoriaId: f.categoria_id,
      total: Number(f.total),
    }));
  },

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
