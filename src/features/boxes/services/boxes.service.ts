import { supabase } from "@/lib/supabase";
import { failureReason, type OperationResult } from "@/lib/supabase-errors";

const BOXES_TABLE = "boxes";
// Solo las columnas que usa la app (no user_id, fechas ni columnas de sincronización).
const BOX_COLUMNS = "id, name, balance, color, icon, ea_rate, yield_from";

export interface Box {
  id: string;
  name: string;
  balance: number;
  color: string | null;
  icon: string | null;
  // % E.A. escrito por el usuario; null = la caja no rinde (ver docs/specs/ea-yield.md).
  ea_rate: number | null;
  // Primer día que rinde ("YYYY-MM-DD"); null si la caja no rinde. Lo fija la BD.
  yield_from: string | null;
}

export const boxesService = {
  getBoxes: async (): Promise<Box[]> => {
    const { data, error } = await supabase
      .from(BOXES_TABLE)
      .select(BOX_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error obteniendo medios:", error);
      throw new Error(error.message);
    }
    return data || [];
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la caja antes de que responda
  // la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  createBox: async (params: {
    id: string;
    name: string;
    initialBalance?: number;
    // % E.A. opcional: la BD fija desde cuándo rinde (el día de la creación).
    eaRate?: number | null;
  }): Promise<OperationResult> => {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase.from(BOXES_TABLE).insert([
      {
        id: params.id,
        name: params.name,
        balance: params.initialBalance ?? 0,
        ...(params.eaRate != null ? { ea_rate: params.eaRate } : {}),
      },
    ]);

    if (error) {
      console.error("Error creando medio:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Nota: "saldo" no se edita aquí a propósito, lo ajusta el trigger de la BD
  // cada vez que se crea/edita/borra un movimiento asociado o se acredita un rendimiento.
  // `yield_from` solo se envía al activar la tasa: la BD ignora cambiarlo después.
  updateBox: async (
    id: string,
    changes: Partial<Pick<Box, "name" | "color" | "icon" | "ea_rate">> & {
      yield_from?: string | null;
    },
  ): Promise<OperationResult> => {
    const { error } = await supabase.from(BOXES_TABLE).update(changes).eq("id", id);
    if (error) {
      console.error("Error actualizando medio:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Acredita ya los rendimientos atrasados de las cajas del usuario (la BD solo toca las
  // suyas). El job diario lo hace igual cada noche; esto evita esperar tras activar la tasa.
  creditMyYields: async (): Promise<OperationResult> => {
    const { error } = await supabase.rpc("credit_my_yields");
    if (error) {
      console.error("Error acreditando rendimientos:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Borra los rendimientos acumulados de la caja y los resta de su saldo (la BD lo hace en
  // una sola transacción y solo sobre cajas del usuario). La tasa se conserva.
  resetYields: async (id: string): Promise<OperationResult> => {
    const { error } = await supabase.rpc("reset_yields", { p_box: id });
    if (error) {
      console.error("Error reiniciando rendimientos:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  deleteBox: async (id: string): Promise<OperationResult> => {
    const { error } = await supabase.from(BOXES_TABLE).delete().eq("id", id);
    if (error) {
      console.error("Error eliminando medio:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },
};
