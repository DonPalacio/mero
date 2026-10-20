import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBuildingBank,
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
} from "@tabler/icons-react";
import { monthLabelText } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";

// Cada cifra vive en un contenedor (@container): su tamaño sigue el ancho disponible para que
// montos de siete cifras no se desborden en pantallas angostas (13cqw ≈ ancho / 7 caracteres).
// En negativo se reduce un poco para dejar sitio al ícono de alerta.
const heroAmountClass = (negative: boolean) =>
  `${negative ? "text-[min(2.5rem,11cqw)]" : "text-[min(2.5rem,13cqw)]"} font-bold whitespace-nowrap leading-none tracking-tight tabular-nums`;
const SUB_AMOUNT_CLASS =
  "text-[min(1.25rem,11cqw)] font-bold whitespace-nowrap leading-tight tracking-tight tabular-nums text-fn-text";

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
            <IconWallet className="size-[1.125rem] text-fn-brand" aria-hidden />
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

      {/* Panel hundido con la cifra principal: lo que queda del mes. */}
      <div className="@container flex min-w-0 flex-col gap-2 rounded-2xl fn-chip p-4">
        <span className="text-sm text-fn-muted">Queda</span>
        <span
          className={`${heroAmountClass(isNegative)} flex items-center gap-2 ${isNegative ? "text-negative" : "text-fn-text"}`}
        >
          {isNegative && <IconAlertTriangle className="size-[0.55em] shrink-0" aria-hidden />}
          <AnimatedNumber value={remaining} />
        </span>
      </div>

      {/* Mosaicos con el ícono arriba, como la fila de acciones del modelo. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="@container min-w-0 rounded-2xl fn-chip p-3">
          <div className="flex flex-col gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-fn-card">
              <IconArrowUpRight className="size-[1.125rem] text-success" aria-hidden />
            </span>
            <span className="text-xs text-fn-muted">Ingresos del mes</span>
            <AnimatedNumber value={income} className={SUB_AMOUNT_CLASS} />
          </div>
        </div>
        <div className="@container min-w-0 rounded-2xl fn-chip p-3">
          <div className="flex flex-col gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-fn-card">
              <IconArrowDownRight className="size-[1.125rem] text-negative" aria-hidden />
            </span>
            <span className="text-xs text-fn-muted">Gastos del mes</span>
            <AnimatedNumber value={expenses} className={SUB_AMOUNT_CLASS} />
          </div>
        </div>
      </div>

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
                    <IconBuildingBank className="size-4 text-fn-muted" aria-hidden />
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
