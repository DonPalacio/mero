import { fmt, monthLabelText } from "@/lib/utils";

interface Medio {
  name: string;
}

interface SummaryProps {
  selectedMonth: string; // formato "YYYY-MM"
  onPrev: () => void;
  onNext: () => void;
  ingresos: number;
  gastos: number;
  queda: number;
  cmpText: string;
  cmpColor: string;
  medios?: Medio[];
  saldosPorMedio?: Record<string, number>;
}

export default function Summary({
  selectedMonth,
  onPrev,
  onNext,
  ingresos,
  gastos,
  queda,
  cmpText,
  cmpColor,
  medios,
  saldosPorMedio,
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
          <span className="text-xl font-bold text-foreground">{fmt(ingresos)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Gastos del mes</span>
          <span className="text-xl font-bold text-foreground">{fmt(gastos)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Queda</span>
          <span className={`text-xl font-bold ${queda < 0 ? "text-red-500" : "text-foreground"}`}>
            {fmt(queda)}
          </span>
          <span className="text-xs" style={{ color: cmpColor }}>
            {cmpText}
          </span>
        </div>
      </div>

      {medios && medios.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <h3 className="text-foreground font-semibold text-sm">Saldo por medio</h3>
          <div className="flex flex-col gap-1 flex-1">
            {medios.map((m) => {
              const saldo = saldosPorMedio?.[m.name] || 0;
              return (
                <div key={m.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className={saldo < 0 ? "text-red-500" : "text-foreground"}>
                    {fmt(saldo)}
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
