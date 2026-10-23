import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signIn, signUp } from "../services/auth.functions";
import { clearAccessTokenCache, setAccessToken } from "@/lib/supabase";
import { prefetchScreen } from "@/lib/queries";

// Formulario de login/registro. La sesión vive en cookies HttpOnly manejadas
// por el servidor; el estado de "quién soy" lo da el guard de __root.tsx
// (router context `user`).
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res =
        mode === "login"
          ? await signIn({ data: { email, password } })
          : await signUp({ data: { email, password } });

      if (res.error) {
        setMsg(res.error);
      } else if ("needsConfirmation" in res && res.needsConfirmation) {
        setMsg("Revisa tu correo para confirmar la cuenta.");
      } else {
        // Sesión creada: se vuelve a correr el guard, que redirige fuera de /login.
        clearAccessTokenCache();
        // El token que ya trae la respuesta evita pedirlo de nuevo al cargar los datos.
        if (res.token) setAccessToken(res.token);
        // Por si la sesión anterior expiró sin pasar por logout: no reutilizar sus datos.
        queryClient.clear();
        // Las consultas del dashboard salen ya, en paralelo con la validación del guard y la
        // navegación; al montarse la pantalla encuentra los datos en vuelo o ya en caché.
        prefetchScreen(queryClient, "/dashboard");
        await router.invalidate();
      }
    } catch {
      setMsg("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    mode,
    setMode,
    msg,
    setMsg,
    loading,
    handleSubmit,
  };
}
