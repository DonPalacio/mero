import { fmt, monthLabelText } from "@/lib/utils";
import { formatYield } from "@/lib/yield";

interface Box {
  name: string;
}

interface SummaryProps {
  selectedMonth: string; // formato "YYYY-MM"
  onPrev: () => void;
  onNext: () => void;
  income: number;
  // Parte de los ingresos que viene del E.A. de las cajas (ya incluida en `ingresos`).
  yields?: number;
  expenses: number;
  remaining: number;
  cmpColor: string;
  boxes?: Box[];
  balancesByBox?: Record<string, number>;
}

export default function Summary({
  selectedMonth,
  onPrev,
  onNext,
  income,
  yields = 0,
  expenses,
  remaining,
  cmpColor,
  boxes,
  balancesByBox,
}: SummaryProps) {
  return (
    <div className="rounded-3xl bg-card border border-border p-4 flex flex-col gap-4 w-full h-full">
      <h2 className="text-foreground font-semibold text-lg">Resumen del mes</h2>

      <div className="flex items-center justify-between">
        <button
          className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-sm text-foreground"
          onClick={onPrev}
        >
          ‹
        </button>
        <span className="font-semibold text-foreground">{monthLabelText(selectedMonth)}</span>
        <button
          className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-sm text-foreground"
          onClick={onNext}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Ingresos del mes</span>
          <span className="text-xl font-bold text-foreground">{fmt(income)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Gastos del mes</span>
          <span className="text-xl font-bold text-foreground">{fmt(expenses)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Queda</span>
          <span
            className={`text-xl font-bold ${remaining < 0 ? "text-red-500" : "text-foreground"}`}
          >
            {fmt(remaining)}
          </span>
        </div>
      </div>

      {boxes && boxes.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <h3 className="text-foreground font-semibold text-sm">Saldo por medio</h3>
          <div className="flex flex-col gap-1 flex-1">
            {boxes.map((m) => {
              const balance = balancesByBox?.[m.name] || 0;
              return (
                <div key={m.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className={balance < 0 ? "text-red-500" : "text-foreground"}>
                    {fmt(balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
