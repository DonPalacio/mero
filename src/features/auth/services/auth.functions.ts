import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Todas las funciones son POST: así nunca se cachean respuestas con tokens.

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Usuario de la sesión actual (o null). Verifica el JWT de la cookie y, si el
// access token expiró, lo refresca y reescribe las cookies HttpOnly.
export const getSessionUser = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return {
    id: data.claims.sub,
    email: data.claims.email ?? null,
  };
});

// Access token de vida corta para el cliente del navegador (queda solo en memoria).
export const getAccessToken = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  return { accessToken: session.access_token, expiresAt: session.expires_at ?? 0 };
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(credentials)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(data);
    return { error: error?.message ?? null };
  });

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(credentials)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const request = getRequest();
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    const { data: result, error } = await supabase.auth.signUp({
      ...data,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    return {
      error: error?.message ?? null,
      // Sin sesión = falta confirmar el correo
      needsConfirmation: !error && !result.session,
    };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
});

// Intercambia el ?code= del correo de confirmación por una sesión (PKCE).
export const exchangeCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    return { error: error?.message ?? null };
  });
