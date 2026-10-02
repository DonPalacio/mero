// Resultado de una escritura (actualizar o eliminar) con el motivo del fallo, para que
// quien llama pueda avisar con precisión en lugar de adivinar la causa.
export type ResultadoOperacion =
  { ok: true } | { ok: false; motivo: "duplicado" | "sin-conexion" | "error" };

// Clasifica un error de PostgREST/Supabase.
export function motivoDeFallo(error: {
  code?: string | null;
}): "duplicado" | "sin-conexion" | "error" {
  // 23505 = violación de índice único (ya existe un registro con ese nombre).
  if (error.code === "23505") return "duplicado";
  // PostgREST siempre responde con un código; sin código la petición no llegó a la
  // base de datos (sin conexión, o falló antes de enviarse).
  if (!error.code) return "sin-conexion";
  return "error";
}
