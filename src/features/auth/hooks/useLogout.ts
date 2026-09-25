import { useRouter } from "@tanstack/react-router";
import { signOut } from "../services/auth.functions";
import { clearAccessTokenCache } from "@/lib/supabase";

export function useLogout() {
  const router = useRouter();

  return async function logout() {
    await signOut();
    clearAccessTokenCache();
    // El guard de __root.tsx detecta que ya no hay sesión y manda a /login.
    await router.invalidate();
  };
}
