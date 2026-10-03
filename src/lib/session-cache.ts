import { getSessionUser } from "@/features/auth/services/auth.functions";

type UsuarioSesion = Awaited<ReturnType<typeof getSessionUser>>;

// Cada navegación del cliente valida la sesión con una petición al servidor (getSessionUser).
// Para no repetirla en cada clic, el último usuario válido se recuerda unos segundos EN EL
// NAVEGADOR. Solo es una comodidad de latencia: los datos siguen protegidos por RLS, porque
// cada consulta lleva su propio JWT. En el servidor (SSR) nunca se usa: allí siempre se valida.
const TTL_MS = 30_000;

let cache: { usuario: NonNullable<UsuarioSesion>; hasta: number } | null = null;
// Sube con cada invalidación: una respuesta que llega después de un login/logout no debe
// volver a guardar al usuario anterior.
let generacion = 0;

export function clearSessionUserCache() {
  cache = null;
  generacion++;
}

export async function getSessionUserCacheado(): Promise<UsuarioSesion> {
  if (typeof window === "undefined") return getSessionUser();

  if (cache && cache.hasta > Date.now()) return cache.usuario;

  const generacionAlPedir = generacion;
  const usuario = await getSessionUser();
  // Solo se recuerda a un usuario con sesión: sin sesión se vuelve a preguntar siempre,
  // para que iniciar sesión se note al instante.
  if (usuario && generacionAlPedir === generacion) {
    cache = { usuario, hasta: Date.now() + TTL_MS };
  }
  return usuario;
}
