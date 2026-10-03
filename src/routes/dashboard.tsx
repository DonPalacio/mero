import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/features/dashboard/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Mero" },
      // App privada: que ningún buscador indexe estas pantallas.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});
