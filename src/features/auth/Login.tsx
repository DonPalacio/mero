import React from "react";
import { useAuth } from "./hooks/useAuth";
import { cn } from "@/lib/utils";
import { IconMail, IconLock } from "@tabler/icons-react";

export default function Login() {
  const {
    email, setEmail,
    password, setPassword,
    modo, setModo,
    msg, setMsg,
    loading,
    handleSubmit
  } = useAuth();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-6 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm"
      >
        {/* Logo / Título */}
        <div className="flex flex-col items-center mb-2">
          <img 
            src="/favicon-white.svg"
            alt="Mero Logo" 
            className="h-8 w-8 mb-4 shrink-0 brightness-0 invert" 
          />
          <h2 className="text-2xl font-bold text-foreground">
            {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {modo === "login" ? "Bienvenido a Mero" : "Comienza a controlar tus finanzas"}
          </p>
        </div>

        {/* Campos de entrada */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Mensaje de estado */}
        {msg && (
          <div className={cn(
            "text-sm font-medium p-3 rounded-md text-center",
            modo === "signup" && !msg.toLowerCase().includes("error") 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}>
            {msg}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Un momento..."
              : modo === "login"
              ? "Entrar"
              : "Registrarme"}
          </button>

          <button
            type="button"
            onClick={() => {
              setModo(modo === "login" ? "signup" : "login");
              setMsg("");
            }}
            className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {modo === "login" ? "¿No tienes cuenta? Crea una aquí" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </form>
    </div>
  );
}
