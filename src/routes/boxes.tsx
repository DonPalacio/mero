import { createFileRoute } from "@tanstack/react-router";
import Boxes from "@/features/boxes/Boxes";

export const Route = createFileRoute("/boxes")({
  head: () => ({
    meta: [
      { title: "Cajas · Mero" },
      // App privada: que ningún buscador indexe estas pantallas.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Boxes,
});
