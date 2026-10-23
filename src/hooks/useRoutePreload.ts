import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

// Pantallas privadas del menú. Cada ruta se empaqueta en su propio archivo: sin esto, la primera
// vez que se entra a una pantalla el clic espera a que el navegador descargue su código.
const PRIVATE_ROUTES = ["/dashboard", "/transactions", "/categories", "/boxes"] as const;

// Descarga en segundo plano el código de las demás pantallas, pero solo cuando la pantalla
// actual ya terminó de pedir sus datos: así no compite con las consultas que necesita para
// pintarse. Se usa una vez, en el shell privado.
export function useRoutePreload() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // En serie: cada preloadRoute vuelve a pasar por el guard de __root.tsx, y así las
    // siguientes aprovechan la sesión que la primera dejó recordada.
    async function preloadOthers() {
      const current = router.state.location.pathname;
      for (const path of PRIVATE_ROUTES) {
        if (cancelled) return;
        if (path === current) continue;
        try {
          await router.preloadRoute({ to: path });
        } catch {
          // Es solo una optimización: si falla, la pantalla se cargará al abrirla.
        }
      }
    }

    // Los efectos de la pantalla (hijos) corren antes que este, así que las consultas de su
    // primera carga ya están en curso y isFetching() las cuenta.
    if (queryClient.isFetching() === 0) {
      void preloadOthers();
    } else {
      unsubscribe = queryClient.getQueryCache().subscribe(() => {
        if (queryClient.isFetching() !== 0) return;
        unsubscribe?.();
        void preloadOthers();
      });
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router, queryClient]);
}
