import { fmt } from "@/lib/utils";

interface PieChartProps {
  gastosPorCajita: Record<string, number>;
}

const SHADES = ["#5b8def", "#4a76c9", "#6d9bf5", "#3d6bc7", "#8ab0f8", "#2f5aa8", "#a9c4fb"];

export default function PieChart({ gastosPorCajita }: PieChartProps) {
  const labels = Object.keys(gastosPorCajita);
  const values = Object.values(gastosPorCajita);

  const total = values.reduce((a, b) => a + b, 0);

  const colors = labels.map((_, i) => SHADES[i % SHADES.length]);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const sw = 32;

  const circ = 2 * Math.PI * r;

  let offset = 0;

  const segments: React.ReactNode[] = [];

  if (total > 0) {
    labels.forEach((label, i) => {
      const frac = gastosPorCajita[label] / total;
      const len = frac * circ;

      segments.push(
        <circle
          key={label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colors[i]}
          strokeWidth={sw}
          strokeDasharray={`${len} ${circ - len}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />,
      );

      offset += len;
    });
  }

  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-4 h-full">
      <h2 className="text-base font-medium text-foreground">Gastos por categoría (este mes)</h2>

      <div className="relative flex flex-1 min-h-[220px] items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="block w-full h-auto max-w-[220px]">
          {total > 0 ? (
            segments
          ) : (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-semibold text-foreground">{fmt(total)}</div>

          <div className="text-xs text-muted-foreground">total</div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {labels.length === 0 && (
          <div className="text-sm text-muted-foreground">Sin gastos este mes</div>
        )}

        {labels.map((label, i) => {
          const pct = total ? ((gastosPorCajita[label] / total) * 100).toFixed(1) : 0;

          return (
            <div className="flex items-center justify-between text-sm" key={label}>
              <span className="flex items-center gap-2 text-foreground">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colors[i] }} />

                {label}
              </span>

              <span className="text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
