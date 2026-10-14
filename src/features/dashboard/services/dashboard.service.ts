import { supabase } from "@/lib/supabase";
import { failureReason, type OperationResult } from "@/lib/supabase-errors";

export interface BoxBalance {
  id: string;
  name: string;
  balance: number;
}

// Total de movimientos de un mes, tipo y categoría (los que tienen categoría).
export interface SummaryRow {
  month: string; // "YYYY-MM"
  type: "expense" | "income";
  categoryId: string;
  total: number;
}

// Pesos acreditados por E.A. en un mes (suma de la tabla `yields`).
export interface MonthYield {
  month: string; // "YYYY-MM"
  total: number;
}

// Forma de la fila que devuelve la función SQL monthly_summary.
interface SummaryRowDB {
  month: string;
  type: "expense" | "income";
  category_id: string;
  total: number | string;
}

// Las lecturas (movimientos, categorías, medios) viven en src/lib/queries.ts,
// compartidas con las demás pantallas.
export const dashboardService = {
  // Totales por mes, tipo y categoría en [desde, hasta) ("YYYY-MM-DD"). Los suma la función
  // SQL monthly_summary (con RLS): así el dashboard no descarga todos los movimientos.
  async getMonthlySummary(fromDate: string, untilDate: string): Promise<SummaryRow[]> {
    const { data, error } = await supabase.rpc("monthly_summary", {
      from_date: fromDate,
      until_date: untilDate,
    });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo el resumen mensual:", error);
      throw new Error(error.message);
    }

    return ((data ?? []) as SummaryRowDB[]).map((f) => ({
      month: f.month,
      type: f.type,
      categoryId: f.category_id,
      total: Number(f.total),
    }));
  },

  // Pesos generados por E.A. por mes en [desde, hasta) ("YYYY-MM-DD"). Los suma la función SQL
  // monthly_yields (con RLS). No son movimientos: se suman aparte a los ingresos.
  async getMonthlyYields(fromDate: string, untilDate: string): Promise<MonthYield[]> {
    const { data, error } = await supabase.rpc("monthly_yields", {
      from_date: fromDate,
      until_date: untilDate,
    });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo los rendimientos mensuales:", error);
      throw new Error(error.message);
    }

    return ((data ?? []) as { month: string; total: number | string }[]).map((f) => ({
      month: f.month,
      total: Number(f.total),
    }));
  },

  // Actualizar el presupuesto mensual de una categoría. Devuelve el motivo del fallo para que
  // quien llama pueda avisar con precisión.
  async updateBudget(id: string, budget: number): Promise<OperationResult> {
    const { error } = await supabase
      .from("categories")
      .update({ monthly_budget: budget })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando presupuesto:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },
};
