import { createFileRoute } from "@tanstack/react-router";
import Transactions from "@/features/transactions/Transactions";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transacciones · Mero" },
      // App privada: que ningún buscador indexe estas pantallas.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Transactions,
});
