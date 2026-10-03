import { createClient } from "@supabase/supabase-js";
import { getAccessToken } from "@/features/auth/services/auth.functions";
import { clearSessionUserCache } from "@/lib/session-cache";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "";
const supabaseKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "";

// Cliente ÚNICO de Supabase para los DATOS en el navegador (PostgREST / Realtime).
// No crear otro createClient() en ningún otro archivo.
//
// La AUTENTICACIÓN ya no pasa por aquí: la sesión vive en cookies HttpOnly que
// solo el servidor puede leer (ver features/auth/services/auth.functions.ts).
// Este cliente pide al servidor un access token de vida corta y lo guarda
// solo en memoria. `supabase.auth.*` no está disponible en este cliente.

const MARGEN_SEGUNDOS = 60;

let cache: { token: string; exp: number } | null = null;
let pendiente: Promise<string | null> | null = null;

// También invalida la sesión recordada por el guard (session-cache.ts): login y logout ya llaman
// a esta función antes de router.invalidate().
export function clearAccessTokenCache() {
  clearSessionUserCache();
  cache = null;
  pendiente = null;
}

async function resolverToken(): Promise<string | null> {
  // En el servidor (SSR) este módulo también se evalúa y supabase-js pide el
  // token al crear el cliente. Allí no hay sesión de navegador: se omite.
  if (typeof window === "undefined") return null;

  const ahora = Math.floor(Date.now() / 1000);
  if (cache && cache.exp - MARGEN_SEGUNDOS > ahora) return cache.token;

  if (!pendiente) {
    pendiente = getAccessToken()
      .then((res) => {
        cache = res ? { token: res.accessToken, exp: res.expiresAt } : null;
        return res?.accessToken ?? null;
      })
      .finally(() => {
        pendiente = null;
      });
  }
  return pendiente;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: resolverToken,
});

// Limpieza única: sesiones antiguas guardadas por supabase-js en localStorage
// (incluían el refresh token, legible por JS). Ya no se usan.
if (typeof window !== "undefined") {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage puede no estar disponible; no es crítico
  }
}
