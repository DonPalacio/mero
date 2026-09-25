import { createFileRoute, redirect } from "@tanstack/react-router";
import { exchangeCode } from "@/features/auth/services/auth.functions";

// Destino del enlace del correo de confirmación de Supabase.
export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.code) {
      await exchangeCode({ data: { code: search.code } });
    }
    // Con sesión -> la app; sin sesión, el guard de __root manda a /login.
    throw redirect({ to: "/" });
  },
});
