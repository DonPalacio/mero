import { supabase } from "@/lib/supabase";
import { motivoDeFallo, type ResultadoOperacion } from "@/lib/supabase-errors";

export interface MovimientoDB {
  id: string;
  tipo: "gasto" | "ingreso";
  monto: number;
  cajita: string; // nombre de la categoría
  medio: string; // nombre del medio
  fecha: string;
  nota: string;
}

// Fila de `movimientos` con el join de medios y categorías (el cliente de Supabase no está
// tipado, así que se describe aquí la forma de lo que devuelve el select).
interface MovimientoFila {
  id: string;
  tipo: "gasto" | "ingreso";
  monto: number | string;
  fecha: string;
  descripcion: string | null;
  medios: { nombre: string } | null;
  categorias: { nombre: string } | null;
}

export const transactionsService = {
  // Trae los movimientos con los nombres de medio/categoría ya resueltos (join).
  // Con `mes` ("YYYY-MM") solo trae los de ese mes; sin él, trae todos.
  async obtenerMovimientos(mes?: string): Promise<MovimientoDB[]> {
    let consulta = supabase
      .from("movimientos")
      .select("*, medios(nombre), categorias(nombre)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (mes) {
      // fecha es de tipo date: el rango [inicio del mes, inicio del mes siguiente)
      const [anio = 0, numMes = 1] = mes.split("-").map(Number);
      const inicio = `${mes}-01`;
      const siguiente =
        numMes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(numMes + 1).padStart(2, "0")}-01`;
      consulta = consulta.gte("fecha", inicio).lt("fecha", siguiente);
    }

    const { data, error } = await consulta;

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo movimientos:", error);
      throw new Error(error.message);
    }

    return (data || []).map((m: MovimientoFila) => ({
      id: m.id,
      tipo: m.tipo,
      monto: Number(m.monto),
      cajita: m.categorias?.nombre ?? "",
      medio: m.medios?.nombre ?? "",
      fecha: m.fecha,
      nota: m.descripcion || "",
    }));
  },

  // Meses ("YYYY-MM") que tienen al menos un movimiento desde `desde` ("YYYY-MM-DD").
  // Solo trae la columna fecha: es una lista liviana para armar el selector de meses.
  async obtenerMesesConMovimientos(desde: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("movimientos")
      .select("fecha")
      .gte("fecha", desde)
      .order("fecha", { ascending: false });

    // Se lanza el error para que React Query no cachee un [] como si fuera válido.
    if (error) {
      console.error("Error obteniendo meses con movimientos:", error);
      throw new Error(error.message);
    }

    return Array.from(new Set((data ?? []).map((m) => m.fecha.substring(0, 7))));
  },

  // El id lo genera el cliente (generarUuid) para poder mostrar la fila antes de que
  // responda la BD. Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  async crearMovimiento(params: {
    id: string;
    tipo: "gasto" | "ingreso";
    monto: number;
    medioId: string;
    categoriaId?: string | null;
    fecha: string;
    nota: string;
  }): Promise<ResultadoOperacion> {
    // user_id lo asigna la BD (default auth.uid()) a partir del JWT
    const { error } = await supabase.from("movimientos").insert([
      {
        id: params.id,
        tipo: params.tipo,
        monto: params.monto,
        medio_id: params.medioId,
        categoria_id: params.categoriaId ?? null,
        fecha: params.fecha,
        descripcion: params.nota || null,
      },
    ]);

    if (error) {
      console.error("Error creando movimiento:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },

  // Devuelve el motivo del fallo para que quien llama pueda avisar con precisión.
  async eliminarMovimiento(id: string): Promise<ResultadoOperacion> {
    const { error } = await supabase.from("movimientos").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando movimiento:", error);
      return { ok: false, motivo: motivoDeFallo(error) };
    }
    return { ok: true };
  },
};
