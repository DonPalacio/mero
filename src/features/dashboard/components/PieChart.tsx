import { IconChartDonut } from "@tabler/icons-react";
import { fmt } from "@/lib/utils";
import AnimatedNumber from "./AnimatedNumber";

interface PieChartProps {
  expensesByCategory: Record<string, number>;
}

// Rampa de azules y grises neutros (sin los rojos/verdes/amarillos de los estados): cada segmento
// se distingue por tono y luminosidad, y la leyenda repite nombre, monto y porcentaje para que la
// identidad no dependa solo del color.
const SHADES = [
  "oklch(0.7 0.16 258)",
  "oklch(0.97 0 0)",
  "oklch(0.8 0.1 235)",
  "oklch(0.7 0 0)",
  "oklch(0.58 0.17 270)",
  "oklch(0.55 0 0)",
  "oklch(0.88 0.06 245)",
];

export default function PieChart({ expensesByCategory }: PieChartProps) {
  const labels = Object.keys(expensesByCategory);
  const values = Object.values(expensesByCategory);

  const total = values.reduce((a, b) => a + b, 0);

  const colors = labels.map((_, i) => SHADES[i % SHADES.length]);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const sw = 20;
  // Separación visual entre segmentos (en unidades de circunferencia); no aplica con uno solo.
  const gap = labels.length > 1 ? 4 : 0;

  const circ = 2 * Math.PI * r;

  let offset = 0;

  const segments: React.ReactNode[] = [];

  if (total > 0) {
    labels.forEach((label, i) => {
      const frac = (expensesByCategory[label] ?? 0) / total;
      const len = Math.max(frac * circ - gap, 0);

      segments.push(
        <circle
          key={label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          style={{ stroke: colors[i] }}
          strokeWidth={sw}
          strokeDasharray={`${len} ${circ - len}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />,
      );

      offset += frac * circ;
    });
  }

  return (
    <div className="fn-card flex h-full flex-col gap-1 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full fn-chip">
          <IconChartDonut className="size-[1.125rem] text-fn-brand" aria-hidden />
        </span>
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
          Gastos por categoría (este mes)
        </h2>
      </div>

      <div className="relative flex min-h-[220px] flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="ring-in block h-auto w-full max-w-[220px]"
          role="img"
          aria-label="Gastos por categoría"
        >
          {/* Anillo base: la misma regla fina del resto de la pantalla */}
          <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-fn-line" strokeWidth={sw} />
          {segments}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="text-xl font-semibold tracking-tight tabular-nums text-fn-text">
            <AnimatedNumber value={total} />
          </div>

          <div className="text-xs text-fn-muted">total</div>
        </div>
      </div>

      <div className="mt-2 flex max-h-40 flex-col divide-y divide-fn-line overflow-y-auto pr-1">
        {labels.length === 0 && (
          <div className="py-2 text-sm text-fn-muted">Sin gastos este mes</div>
        )}

        {labels.map((label, i) => {
          const pct = total ? (((expensesByCategory[label] ?? 0) / total) * 100).toFixed(1) : "0";

          return (
            <div className="flex items-center justify-between gap-3 py-2 text-sm" key={label}>
              <span className="flex min-w-0 items-center gap-2 text-fn-text">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: colors[i] }}
                />
                <span className="truncate">{label}</span>
              </span>

              <span className="flex shrink-0 items-baseline gap-3 tabular-nums text-fn-muted">
                <span className="text-fn-text">{fmt(expensesByCategory[label] ?? 0)}</span>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
