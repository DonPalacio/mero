import { supabase } from "@/lib/supabase";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";

export const dashboardService = {
  // 1. Obtener todos los movimientos del usuario actual
  async obtenerMovimientos(): Promise<Movimiento[]> {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al obtener movimientos de Supabase:", error);
      throw new Error(error.message);
    }

    return (data || []).map((m) => ({
      id: m.id,
      tipo: m.tipo as "gasto" | "ingreso",
      monto: Number(m.monto),
      cajita: m.cajita,
      medio: m.cajita, // Por ahora mapeamos cajita al medio/box
      fecha: m.fecha,
      nota: m.nota || "",
    }));
  },

  // 2. Obtener cajitas con sus presupuestos
  async obtenerCajitas(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from("cajitas")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener cajitas de Supabase:", error);
      throw new Error(error.message);
    }

    return (data || []).map((c) => ({
      name: c.name,
      tipo: "gasto", // En el schema las cajitas actúan como categorías/gastos
      budget: Number(c.budget),
    }));
  },

  // 3. Crear un movimiento nuevo
  async crearMovimiento(movimiento: Omit<Movimiento, "id">): Promise<Movimiento> {
    const { data, error } = await supabase
      .from("movimientos")
      .insert([
        {
          tipo: movimiento.tipo,
          monto: movimiento.monto,
          cajita: movimiento.cajita,
          fecha: movimiento.fecha,
          nota: movimiento.nota,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error al crear movimiento en Supabase:", error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      tipo: data.tipo as "gasto" | "ingreso",
      monto: Number(data.monto),
      cajita: data.cajita,
      medio: data.cajita,
      fecha: data.fecha,
      nota: data.nota || "",
    };
  },

  // 4. Eliminar movimiento
  async eliminarMovimiento(id: string): Promise<void> {
    const { error } = await supabase
      .from("movimientos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar movimiento en Supabase:", error);
      throw new Error(error.message);
    }
  },
};