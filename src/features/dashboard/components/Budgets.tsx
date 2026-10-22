import React, { useState } from "react";
import { fmt, cn } from "@/lib/utils";

export interface Category {
  id: string;
  name: string;
  type: string;
  budget: number;
}

interface BudgetsProps {
  categories: Category[];
  expensesByCategory: Record<string, number>;
  onBudgetChange: (id: string, value: string) => void;
}

export default function Budgets({ categories, expensesByCategory, onBudgetChange }: BudgetsProps) {
  // Estado local para permitir escribir libremente antes de guardar
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const getValue = (c: Category) =>
    inputValues[c.id] !== undefined ? inputValues[c.id] : String(c.budget);

  const handleChange = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  };

  const commitChange = (id: string) => {
    const value = inputValues[id];
    if (value === undefined) return;
    // Se suelta el valor local: el campo vuelve a mostrar el presupuesto de la caché, que ya
    // tiene el valor nuevo (optimista) y, si la BD lo rechaza, recupera el anterior.
    setInputValues((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
    onBudgetChange(id, value);
  };

  return (
    <div className="fn-card flex h-full min-h-0 flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">Presupuestos</h2>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-8 gap-y-5 overflow-y-auto pr-1 pt-2 lg:grid-cols-2">
        {expenseCategories.length === 0 && (
          <p className="text-sm text-fn-muted">Sin categorías de gasto</p>
        )}
        {expenseCategories.map((c, index) => {
          const spent = expensesByCategory[c.name] || 0;
          const pct = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;
          const exceeded = c.budget > 0 && spent > c.budget;
          const nearLimit = !exceeded && pct >= 80;

          let colorClass = "bg-fn-brand";
          if (exceeded) {
            colorClass = "bg-negative"; // Se pasó del presupuesto
          } else if (nearLimit) {
            colorClass = "bg-warning"; // Cerca del límite
          }

          return (
            <div key={c.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-fn-text">
                  <span className="truncate">{c.name}</span>
                  {/* Sin ícono: el estado se ve en el color de la barra y se anuncia a lectores de pantalla. */}
                  {exceeded && <span className="sr-only">Presupuesto superado</span>}
                  {nearLimit && <span className="sr-only">Cerca del límite</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums text-fn-muted">
                  {fmt(spent)} /{" "}
                  <input
                    id={`budget-${c.id}`}
                    name={`budget-${c.id}`}
                    type="number"
                    inputMode="numeric"
                    aria-label={`Presupuesto de ${c.name}`}
                    value={getValue(c)}
                    className="w-28 rounded-full border border-fn-line bg-fn-chip px-3 py-1.5 text-right text-sm tabular-nums text-fn-text transition-colors [appearance:textfield] hover:border-fn-muted focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onChange={(e) => handleChange(c.id, e.target.value)}
                    onBlur={() => commitChange(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                    }}
                  />
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-fn-chip">
                <div
                  className={cn(
                    "fill-reveal h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                    colorClass,
                  )}
                  style={{ width: `${pct}%`, "--i": Math.min(index, 8) } as React.CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
