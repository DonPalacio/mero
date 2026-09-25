import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

// En desarrollo Vite carga .env.local en import.meta.env (no en process.env);
// en Vercel las variables están en process.env. Se leen ambos.
function env(name: string): string {
  return process.env[name] ?? (import.meta.env[name] as string | undefined) ?? "";
}

// Cliente de Supabase SOLO para el servidor (server functions / SSR).
// Lee y escribe la sesión en cookies HttpOnly: el JavaScript del navegador
// nunca ve el refresh token.
export function createSupabaseServerClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env["NODE_ENV"] === "production",
            sameSite: "lax",
            path: "/",
          });
        }
      },
    },
  });
}
