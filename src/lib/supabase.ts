import { createClient } from "@supabase/supabase-js";

// Vite usa import.meta.env en lugar de process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación rápida para que el error sea claro si se nos olvida poner las llaves en Vercel
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan las credenciales de Supabase. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel o en tu .env.local"
  );
}

// Exportamos el cliente para usarlo en todos nuestros servicios
export const supabase = createClient(
  supabaseUrl || "https://tu-proyecto.supabase.co", // Fallback temporal para que no explote la app visualmente
  supabaseAnonKey || "tu-anon-key-publica"
);