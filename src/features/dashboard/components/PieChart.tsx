import { useId } from "react";
import { fmt } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";
import { CHART_COLORS } from "./chartColors";

interface PieChartProps {
  expensesByCategory: Record<string, number>;
}

// Medidor de media luna: va de las 9 a las 3 pasando por las 12.
const W = 200;
const H = 114;
const CX = W / 2;
const CY = 102;
const R = 82;
const SW = 22;

function pointAt(angle: number) {
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

// Arco entre dos ángulos (π = izquierda, 0 = derecha), recorrido en sentido horario.
function arcPath(from: number, to: number) {
  const start = pointAt(from);
  const end = pointAt(to);
  const large = from - to > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default function PieChart({ expensesByCategory }: PieChartProps) {
  // De mayor a menor gasto: la categoría que más pesa abre el medidor y la lista.
  const entries = Object.entries(expensesByCategory)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const top = entries[0];
  const topPct = top && total ? (top[1] / total) * 100 : 0;

  // Ids únicos por instancia para los degradados de cada segmento.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Segmentos pegados, con extremos rectos: el primero arranca en el extremo izquierdo y el último
  // termina en el derecho.
  let cursor = Math.PI;
  const segments = entries.map(([label, value], i) => {
    const frac = value / total;
    const from = cursor;
    const to = from - frac * Math.PI;
    cursor = to;

    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = (frac * 100).toFixed(1);

    return { label, value, pct, color, d: arcPath(from, to), id: `${uid}-${i}` };
  });

  return (
    <div className="fn-card flex h-full flex-col gap-5 p-5 sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
        Gastos por categoría
      </h2>

      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs text-fn-muted">Total gastado este mes</span>
          <AnimatedNumber
            value={total}
            className="text-3xl font-medium tracking-tight tabular-nums text-fn-text"
          />
        </div>

        <div className="relative mx-auto w-full max-w-[240px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ring-in block h-auto w-full"
            role="img"
            aria-label="Gastos por categoría"
          >
            <defs>
              {segments.map((s) => (
                // Degradado vertical del mismo color: pierde fuerza hacia abajo y gana volumen.
                <linearGradient
                  key={s.id}
                  id={s.id}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={CY - R - SW / 2}
                  x2={0}
                  y2={CY}
                >
                  <stop offset="0" stopColor={s.color} />
                  <stop offset="1" stopColor={s.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>

            {/* Pista base: el mismo trazo vacío cuando no hay gastos */}
            <path d={arcPath(Math.PI, 0)} fill="none" className="stroke-fn-chip" strokeWidth={SW} />

            {segments.map((s) => (
              <g
                key={s.label}
                className="transition-[filter] duration-200 hover:brightness-125 motion-reduce:transition-none"
              >
                <title>{`${s.label}: ${fmt(s.value)} (${s.pct}%)`}</title>
                <path d={s.d} fill="none" stroke={`url(#${s.id})`} strokeWidth={SW} />
              </g>
            ))}
          </svg>

          {/* Categoría que más pesa, en el hueco del medidor */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-8 text-center">
            {top ? (
              <>
                <span className="text-lg font-semibold leading-none tabular-nums text-fn-text">
                  {topPct.toFixed(0)}%
                </span>
                <span className="mt-1 max-w-full truncate text-[0.6875rem] text-fn-muted">
                  {top[0]}
                </span>
              </>
            ) : (
              <span className="text-[0.6875rem] text-fn-muted">Sin gastos</span>
            )}
          </div>
        </div>
      </div>

      {/* Una fila por categoría: punto de color, nombre y porcentaje en su propia píldora. */}
      <ul className="-ml-4 -mr-1 flex max-h-40 flex-wrap gap-2 overflow-y-auto pl-1 pr-1 pb-1">
        {entries.length === 0 && (
          <li className="py-1 text-sm text-fn-muted">Sin gastos este mes</li>
        )}

        {segments.map((s) => (
          <li
            key={s.label}
            title={`${s.label}: ${fmt(s.value)}`}
            className="flex min-w-0 max-w-full items-center gap-2 border border-transparent py-1.5 pl-3 pr-1.5 text-sm"
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate text-fn-text">{s.label}</span>
            <span className="shrink-0 rounded-full bg-fn-chip px-2 py-0.5 text-xs font-medium tabular-nums text-fn-text">
              {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
