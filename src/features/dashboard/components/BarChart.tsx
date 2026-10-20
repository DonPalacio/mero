import { IconChartBar } from "@tabler/icons-react";

interface BarChartProps {
  labels: string[];
  values: number[];
}

export default function BarChart({ labels, values }: BarChartProps) {
  const max = Math.max(...values, 1);
  const w = 300,
    h = 220,
    padB = 30,
    padT = 24;
  const bw = w / values.length;
  const barWidth = bw * 0.5;
  const lastIndex = values.length - 1;

  return (
    <div className="flex h-full w-full flex-col gap-4 fn-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full fn-chip">
          <IconChartBar className="size-[1.125rem] text-fn-brand" aria-hidden />
        </span>
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
          Últimos 6 meses
        </h2>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: "100%", height: "100%" }}
          role="img"
          aria-label="Últimos 6 meses"
        >
          {/* Guía al 50 % y línea base: reglas finas, sin relleno */}
          <line
            x1={0}
            y1={h - padB - 0.5 * (h - padB - padT)}
            x2={w}
            y2={h - padB - 0.5 * (h - padB - padT)}
            className="stroke-fn-line"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <line
            x1={0}
            y1={h - padB}
            x2={w}
            y2={h - padB}
            className="stroke-fn-line"
            strokeWidth={1}
          />

          {values.map((v, i) => {
            const bh = v > 0 ? (v / max) * (h - padB - padT) : 0;
            const x = i * bw + (bw - barWidth) / 2;
            const y = h - padB - bh;
            const isCurrent = i === lastIndex;

            return (
              <g key={i}>
                {/* Valor sobre la barra, solo si tiene datos */}
                {v > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isCurrent ? 700 : 500}
                    className={isCurrent ? "fill-fn-brand" : "fill-fn-muted"}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v.toLocaleString("es-CO")}
                  </text>
                )}

                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={bh}
                  rx={6}
                  className={`bar-rise transition-[y,height] duration-300 ease-out motion-reduce:transition-none ${isCurrent ? "fill-fn-brand" : "fill-[oklch(0.45_0_0)]"}`}
                  style={{ "--i": i } as React.CSSProperties}
                />

                {/* Marca guía cuando el mes no tiene registros aún */}
                {v === 0 && (
                  <line
                    x1={x + barWidth * 0.25}
                    x2={x + barWidth * 0.75}
                    y1={h - padB - 1.5}
                    y2={h - padB - 1.5}
                    className="stroke-fn-muted"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )}

                <text
                  x={x + barWidth / 2}
                  y={h - 10}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={isCurrent ? 700 : 400}
                  className={`pointer-events-none ${isCurrent ? "fill-fn-text" : "fill-fn-muted"}`}
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
