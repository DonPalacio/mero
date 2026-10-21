import { useId } from "react";
import { IconChartDonut } from "@tabler/icons-react";
import { fmt } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";
import { CHART_COLORS } from "./chartColors";

interface PieChartProps {
  expensesByCategory: Record<string, number>;
}

export default function PieChart({ expensesByCategory }: PieChartProps) {
  const labels = Object.keys(expensesByCategory);
  const values = Object.values(expensesByCategory);

  const total = values.reduce((a, b) => a + b, 0);

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const sw = 20;
  // Separación visual entre segmentos (en unidades de circunferencia); no aplica con uno solo.
  const gap = labels.length > 1 ? 4 : 0;

  const circ = 2 * Math.PI * r;
  // Ids únicos por instancia para los degradados de cada segmento.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  let offset = 0;

  const segments: React.ReactNode[] = [];
  const defs: React.ReactNode[] = [];

  if (total > 0) {
    labels.forEach((label, i) => {
      const frac = (expensesByCategory[label] ?? 0) / total;
      const arc = frac * circ;
      // Cada segmento cede `gap` al final: también el último, para que haya rendija en el cierre (arriba,
      // a las 12) y no queden pegados el último y el primer gasto.
      const len = Math.max(arc - gap, 0);
      const pct = (frac * 100).toFixed(1);

      defs.push(
        // Degradado vertical del mismo color: pierde fuerza hacia abajo y gana volumen. El giro de
        // +90° compensa el rotate(-90) con el que se dibuja el círculo.
        <linearGradient
          key={label}
          id={`${uid}-${i}`}
          gradientUnits="userSpaceOnUse"
          gradientTransform={`rotate(90 ${cx} ${cy})`}
          x1={0}
          y1={0}
          x2={0}
          y2={size}
        >
          <stop offset="0" stopColor={colors[i]} />
          <stop offset="1" stopColor={colors[i]} stopOpacity={0.55} />
        </linearGradient>,
      );

      segments.push(
        <g
          key={label}
          className="transition-[filter] duration-200 hover:brightness-125 motion-reduce:transition-none"
        >
          <title>{`${label}: ${fmt(expensesByCategory[label] ?? 0)} (${pct}%)`}</title>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${uid}-${i})`}
            strokeWidth={sw}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </g>,
      );

      offset += arc;
    });
  }

  return (
    <div className="fn-card flex h-full flex-col gap-1 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full fn-chip">
          <IconChartDonut className="size-[1.125rem] text-foreground" aria-hidden />
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
          <defs>{defs}</defs>

          {/* Marcas finas alrededor del anillo: dan la sensación de un dial sin añadir color */}
          <circle
            cx={cx}
            cy={cy}
            r={r + sw / 2 + 6}
            fill="none"
            className="stroke-fn-muted opacity-40"
            strokeWidth={3}
            strokeDasharray="1 7.3255"
          />
          {/* Pozo central hundido donde vive el total */}
          <circle
            cx={cx}
            cy={cy}
            r={r - sw / 2 - 6}
            className="fill-fn-chip stroke-fn-line"
            strokeWidth={1}
          />
          {/* Anillo base: la misma regla fina del resto de la pantalla */}
          <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-fn-chip" strokeWidth={sw} />
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
