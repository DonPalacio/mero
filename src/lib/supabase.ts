import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "";
const supabaseKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "";

// Cliente ÚNICO de Supabase para toda la app.
// No crear otro createClient() en ningún otro archivo (services, hooks, etc.)
// Todos deben importar este mismo cliente para evitar conflictos de sesión.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // guarda la sesión en localStorage
    autoRefreshToken: true, // refresca el JWT automáticamente antes de que expire
    detectSessionInUrl: true, // necesario para flujos de confirmación por email / OAuth
  },
});