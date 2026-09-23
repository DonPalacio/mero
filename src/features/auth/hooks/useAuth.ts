import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado real de sesión, sincronizado con Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Al montar: recupera la sesión persistida (si el JWT sigue válido)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    // Se dispara en login, logout, refresh de token, etc.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } =
      modo === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setMsg(error.message);
    } else if (modo === "signup") {
      setMsg("Revisa tu correo para confirmar la cuenta.");
    }
    // En login exitoso no hace falta redirigir aquí:
    // onAuthStateChange actualiza `session`, y el guard de rutas se encarga de mover al usuario.

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    modo,
    setModo,
    msg,
    setMsg,
    loading,
    handleSubmit,
    handleLogout,
    session,
    user,
    initializing,
    isAuthenticated: !!session,
  };
}
