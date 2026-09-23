import { supabase } from "@/lib/supabase";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";

export interface MedioSaldo {
  id: string;
  name: string;
  saldo: number;
}

export const dashboardService = {
  // 1. Obtener todos los movimientos del usuario actual
  async obtenerMovimientos(): Promise<Movimiento[]> {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*, medios(nombre), categorias(nombre)")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al obtener movimientos de Supabase:", error);
      throw new Error(error.message);
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      tipo: m.tipo as "gasto" | "ingreso",
      monto: Number(m.monto),
      cajita: m.categorias?.nombre ?? "",
      medio: m.medios?.nombre ?? "",
      fecha: m.fecha,
      nota: m.descripcion || "",
    }));
  },

  // 2. Obtener categorías con sus presupuestos
  async obtenerCajitas(): Promise<any[]> {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al obtener categorías de Supabase:", error);
      throw new Error(error.message);
    }

    return (data || []).map((c) => ({
      id: c.id,
      name: c.nombre,
      tipo: c.tipo as "gasto" | "ingreso",
      budget: Number(c.presupuesto_mensual),
    }));
  },

  // 3. Obtener TODOS los medios con su saldo real (lo mantiene el trigger de la BD)
  async obtenerMedios(): Promise<MedioSaldo[]> {
    const { data, error } = await supabase
      .from("medios")
      .select("id, nombre, saldo")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al obtener medios de Supabase:", error);
      throw new Error(error.message);
    }

    return (data || []).map((m) => ({
      id: m.id,
      name: m.nombre,
      saldo: Number(m.saldo),
    }));
  },

  // 4. Actualizar el presupuesto mensual de una categoría
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