import React from "react";
import { fmt, cn } from "@/lib/utils";

export interface Categoria {
  name: string;
  tipo: string;
  budget: number;
}

interface BudgetsProps {
  categorias: Categoria[];
  gastosPorCajita: Record<string, number>;
  onBudgetChange: (name: string, value: string) => void;
}

export default function Budgets({ categorias, gastosPorCajita, onBudgetChange }: BudgetsProps) {

  const gastoCategorias = categorias.filter((c) => c.tipo === "gasto");

  return (
    <div className="p-4 rounded-3xl border border-border bg-card flex flex-col gap-4 h-full">
      <h2 className="font-semibold text-lg text-card-foreground">Presupuestos</h2>

      <div className="overflow-y-auto flex-1 pr-2 flex flex-col gap-4">
        {gastoCategorias.map((c) => {
          const spent = gastosPorCajita[c.name] || 0;
          const pct = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;

          let colorClass = "bg-primary";
          if (c.budget > 0 && spent > c.budget) {
            colorClass = "bg-destructive"; // Rojo si se pasa
          } else if (pct >= 80) {
            colorClass = "bg-amber-500"; // Naranja si está cerca del límite
          }

          return (
            <div key={c.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-muted-foreground flex items-center gap-2">
                  {fmt(spent)} /{" "}
                  <input
                    type="number"
                    value={c.budget}
                    className="w-24 px-2 py-1 text-sm bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    onChange={(e) => onBudgetChange(c.name, e.target.value)}
                  />
                </span>
              </div>

              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-1">
                <div
                  className={cn("h-full rounded-full transition-all", colorClass)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
