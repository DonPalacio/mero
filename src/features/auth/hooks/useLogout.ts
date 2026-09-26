import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "../services/auth.functions";
import { clearAccessTokenCache } from "@/lib/supabase";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function logout() {
    await signOut();
    clearAccessTokenCache();
    // El guard de __root.tsx detecta que ya no hay sesión y manda a /login.
    await router.invalidate();
    // Los datos cacheados son del usuario que salió: no deben verse en la siguiente sesión.
    queryClient.clear();
  };
}
