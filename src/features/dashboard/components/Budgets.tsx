import React, { useState } from "react";
import { IconAlertOctagon, IconAlertTriangle, IconTargetArrow } from "@tabler/icons-react";
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
    <div className="fn-card flex h-auto flex-col gap-4 p-5 lg:h-full">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full fn-chip">
          <IconTargetArrow className="size-[1.125rem] text-fn-brand" aria-hidden />
        </span>
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">Presupuestos</h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
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
            <div key={c.id} className="flex flex-col gap-2.5 rounded-2xl fn-chip p-3.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-fn-text">
                  <span className="truncate">{c.name}</span>
                  {/* El estado no depende del color: cada uno lleva su propio ícono y etiqueta. */}
                  {exceeded && (
                    <IconAlertOctagon
                      role="img"
                      aria-label="Presupuesto superado"
                      className="size-4 shrink-0 text-negative"
                    />
                  )}
                  {nearLimit && (
                    <IconAlertTriangle
                      role="img"
                      aria-label="Cerca del límite"
                      className="size-4 shrink-0 text-warning"
                    />
                  )}
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
                    className="w-28 rounded-full border border-fn-line bg-fn-card px-3 py-1.5 text-right text-sm tabular-nums text-fn-text transition-colors [appearance:textfield] hover:border-fn-muted focus-visible:border-fn-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fn-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onChange={(e) => handleChange(c.id, e.target.value)}
                    onBlur={() => commitChange(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                    }}
                  />
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-fn-card">
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
