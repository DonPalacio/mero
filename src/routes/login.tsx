import { createFileRoute } from "@tanstack/react-router";
import Login from "@/features/auth/Login";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/login")({
  // /login es la única pantalla pública e indexable: lleva su URL canónica. Las pantallas
  // privadas son noindex y no la necesitan.
  head: () => ({
    meta: [
      { title: "Mero | Iniciar sesión" },
      { property: "og:url", content: `${SITE_URL}/login` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/login` }],
  }),
  component: Login,
});
