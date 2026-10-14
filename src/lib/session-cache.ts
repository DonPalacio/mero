import { getSessionUser } from "@/features/auth/services/auth.functions";

type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

// Cada navegación del cliente valida la sesión con una petición al servidor (getSessionUser).
// Para no repetirla en cada clic, el último usuario válido se recuerda unos segundos EN EL
// NAVEGADOR. Solo es una comodidad de latencia: los datos siguen protegidos por RLS, porque
// cada consulta lleva su propio JWT. En el servidor (SSR) nunca se usa: allí siempre se valida.
const TTL_MS = 30_000;

let cache: { sessionUser: NonNullable<SessionUser>; untilDate: number } | null = null;
// Sube con cada invalidación: una respuesta que llega después de un login/logout no debe
// volver a guardar al usuario anterior.
let generation = 0;

export function clearSessionUserCache() {
  cache = null;
  generation++;
}

export async function getCachedSessionUser(): Promise<SessionUser> {
  if (typeof window === "undefined") return getSessionUser();

  if (cache && cache.untilDate > Date.now()) return cache.sessionUser;

  const generationAtRequest = generation;
  const sessionUser = await getSessionUser();
  // Solo se recuerda a un usuario con sesión: sin sesión se vuelve a preguntar siempre,
  // para que iniciar sesión se note al instante.
  if (sessionUser && generationAtRequest === generation) {
    cache = { sessionUser, untilDate: Date.now() + TTL_MS };
  }
  return sessionUser;
}
