import { createFileRoute } from "@tanstack/react-router";
import Login from "@/features/auth/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Mero | Iniciar Sesión" }],
  }),
  component: Login,
});
