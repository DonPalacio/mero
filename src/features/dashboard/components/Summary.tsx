import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconPackages,
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
} from "@tabler/icons-react";
import { monthLabelText } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";

interface Box {
  name: string;
}

interface SummaryProps {
  selectedMonth: string; // formato "YYYY-MM"
  onPrev: () => void;
  onNext: () => void;
  income: number;
  expenses: number;
  remaining: number;
  boxes?: Box[];
  balancesByBox?: Record<string, number>;
}

export default function Summary({
  selectedMonth,
  onPrev,
  onNext,
  income,
  expenses,
  remaining,
  boxes,
  balancesByBox,
}: SummaryProps) {
  const isNegative = remaining < 0;

  return (
    <div className="fn-card flex h-full w-full flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full fn-chip">
            <IconWallet className="size-[1.125rem] text-foreground" aria-hidden />
          </span>
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
            Resumen del mes
          </h2>
        </div>

        {/* Selector de mes: píldora con la opción activa rellena, como las pestañas del modelo. */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Mes anterior"
            className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text"
            onClick={onPrev}
          >
            <IconChevronLeft className="size-4" aria-hidden />
          </button>
          {/* Ancho fijo (cabe "Septiembre de 2026"): la píldora no cambia de tamaño entre meses. */}
          <span className="w-40 shrink-0 whitespace-nowrap rounded-full bg-fn-text px-3 py-1.5 text-center text-xs font-semibold text-fn-ground">
            <span key={selectedMonth} className="label-swap inline-block">
              {monthLabelText(selectedMonth)}
            </span>
          </span>
          <button
            aria-label="Mes siguiente"
            className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text"
            onClick={onNext}
          >
            <IconChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Tres filas en un solo panel: ícono y etiqueta a la izquierda, cifra alineada a la derecha. */}
      <ul className="rounded-2xl fn-chip px-4">
        <li className="flex items-center justify-between gap-3 py-3.5">
          <span className="text-sm font-medium text-fn-text">Queda</span>
          <span
            className={`flex items-center gap-2 text-xl font-bold leading-none tracking-tight tabular-nums ${isNegative ? "text-negative" : "text-fn-text"}`}
          >
            <AnimatedNumber value={remaining} />
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 py-3.5">
          <span className="flex items-center gap-2.5 text-sm text-fn-muted">
            <span className="flex size-8 items-center justify-center rounded-full bg-fn-card">
              <IconArrowUpRight className="size-4 text-success" aria-hidden />
            </span>
            Ingresos del mes
          </span>
          <AnimatedNumber
            value={income}
            className="text-base font-semibold tabular-nums text-fn-text"
          />
        </li>
        <li className="flex items-center justify-between gap-3 py-3.5">
          <span className="flex items-center gap-2.5 text-sm text-fn-muted">
            <span className="flex size-8 items-center justify-center rounded-full bg-fn-card">
              <IconArrowDownRight className="size-4 text-negative" aria-hidden />
            </span>
            Gastos del mes
          </span>
          <AnimatedNumber
            value={expenses}
            className="text-base font-semibold tabular-nums text-fn-text"
          />
        </li>
      </ul>

      {boxes && boxes.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h3 className="text-sm font-semibold text-fn-text">Saldo por medio</h3>
          <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {boxes.map((m) => {
              const balance = balancesByBox?.[m.name] || 0;
              return (
                <li
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl fn-chip px-3 py-2.5 text-sm"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fn-card">
                    <IconPackages className="size-4 text-foreground" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fn-text">{m.name}</span>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${balance < 0 ? "text-negative" : "text-fn-text"}`}
                  >
                    <AnimatedNumber value={balance} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
