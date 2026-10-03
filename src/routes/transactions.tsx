import { createFileRoute } from "@tanstack/react-router";
import Transactions from "@/features/transactions/Transactions";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Mero | Transacciones" },
      // App privada: que ningún buscador indexe estas pantallas.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Transactions,
});
