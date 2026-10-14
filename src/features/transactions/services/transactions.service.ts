import { supabase } from "@/lib/supabase";
import { failureReason, type OperationResult } from "@/lib/supabase-errors";

export interface TransactionRow {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string; // nombre de la categoría
  box: string; // nombre del medio
  date: string;
  note: string;
}

// Fila de `transactions` con el join de medios y categorías (el cliente de Supabase no está
// tipado, así que se describe aquí la forma de lo que devuelve el select).
interface TransactionListRow {
  id: string;
  type: "expense" | "income";
  amount: number | string;
  date: string;
  description: string | null;
  boxes: { name: string } | null;
  categories: { name: string } | null;
}

export const transactionsService = {
  // Trae los movimientos con los nombres de medio/categoría ya resueltos (join).
  // Con `mes` ("YYYY-MM") solo trae los de ese mes; sin él, trae todos.
  async getTransactions(month?: string): Promise<TransactionRow[]> {
    let query = supabase
      .from("transactions")
      .select("id, type, amount, date, description, boxes(name), categories(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) {
      // fecha es de tipo date: el rango [inicio del mes, inicio del mes siguiente)
      const [yearNumber = 0, monthNumber = 1] = month.split("-").map(Number);
      const start = `${month}-01`;
      const nextMonthStart =
        monthNumber === 12
          ? `${yearNumber + 1}-01-01`
          : `${yearNumber}-${String(monthNumber + 1).padStart(2, "0")}-01`;
      query = query.gte("date", start).lt("date", nextMonthStart);
    }

    const { data, error } = await query;

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo movimientos:", error);
      throw new Error(error.message);
    }

    // Con un select explícito supabase-js infiere los joins como arreglos, pero al ser
    // relaciones a-uno PostgREST devuelve un objeto (o null): MovimientoFila describe la forma real.
    return ((data || []) as unknown as TransactionListRow[]).map((m) => ({
      id: m.id,
      type: m.type,
      amount: Number(m.amount),
      category: m.categories?.name ?? "",
      box: m.boxes?.name ?? "",
      date: m.date,
      note: m.description || "",
    }));
  },

  // Meses ("YYYY-MM") que tienen al menos un movimiento desde `desde` ("YYYY-MM-DD"), más
  // reciente primero. Los resuelve la función SQL months_with_transactions (con RLS): así no se
  // descargan todas las fechas ni se tropieza con el tope de filas de PostgREST.
  async getMonthsWithTransactions(fromDate: string): Promise<string[]> {
    const { data, error } = await supabase.rpc("months_with_transactions", { from_date: fromDate });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo meses con movimientos:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as string[];
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la fila antes de que
  // responda la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  async createTransaction(params: {
    id: string;
    type: "expense" | "income";
    amount: number;
    boxId: string;
    categoryId?: string | null;
    date: string;
    note: string;
  }): Promise<OperationResult> {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase.from("transactions").insert([
      {
        id: params.id,
        type: params.type,
        amount: params.amount,
        box_id: params.boxId,
        category_id: params.categoryId ?? null,
        date: params.date,
        description: params.note || null,
      },
    ]);

    if (error) {
      console.error("Error creando movimiento:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  async deleteTransaction(id: string): Promise<OperationResult> {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando movimiento:", error);
      return { ok: false, reason: failureReason(error) };
    }
    return { ok: true };
  },
};
