import { createFileRoute } from "@tanstack/react-router";
import Categories from "@/features/categories/Categories";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categorías · Mero" },
      // App privada: que ningún buscador indexe estas pantallas.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Categories,
});
