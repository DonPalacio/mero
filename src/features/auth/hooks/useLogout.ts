import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "../services/auth.functions";
import { clearAccessTokenCache } from "@/lib/supabase";
import { setSigningOut } from "@/lib/signing-out";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function logout() {
    // Desde el clic el shell privado deja de dibujarse (ver RootComponent): así el dashboard
    // no se ve mientras el servidor cierra la sesión y el router llega a /login.
    setSigningOut(true);

    try {
      await signOut();
    } catch {
      // La sesión sigue activa: se vuelve a mostrar la pantalla y se avisa.
      setSigningOut(false);
      toast.error("No se pudo cerrar la sesión");
      return;
    }

    clearAccessTokenCache();
    // Los datos cacheados son del usuario que salió: no deben verse en la siguiente sesión.
    // Ya no hay pantalla privada montada, así que no se vuelven a pedir.
    queryClient.clear();

    try {
      // Directo a /login, sin esperar a que el guard de __root.tsx lo deduzca con un invalidate.
      // El estado "saliendo" NO se quita aquí: navigate() resuelve antes de que React dibuje
      // /login, y quitarlo ya dejaría ver la pantalla anterior (con la caché vacía: su esqueleto).
      // Lo quita RootComponent cuando /login ya está en pantalla.
      await router.navigate({ to: "/login", replace: true });
    } catch (error) {
      // No se llegó a /login: se vuelve a mostrar la pantalla y el guard decidirá.
      setSigningOut(false);
      throw error;
    }
  };
}
