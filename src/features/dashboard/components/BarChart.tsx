interface BarChartProps {
  labels: string[];
  values: number[];
}

export default function BarChart({ labels, values }: BarChartProps) {
  const max = Math.max(...values, 1);
  const w = 300,
    h = 220,
    padB = 28,
    padT = 24;
  const bw = w / values.length;
  const barWidth = bw * 0.5;
  const lastIndex = values.length - 1;

  return (
    <div className="rounded-3xl bg-card border border-border p-4 flex flex-col gap-4 w-full h-full">
      <h2 className="text-foreground font-semibold text-lg">Últimos 6 meses</h2>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="barActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7aa2ff" />
              <stop offset="100%" stopColor="#5b8def" />
            </linearGradient>
            <linearGradient id="barMuted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f4657" />
              <stop offset="100%" stopColor="#33394a" />
            </linearGradient>
          </defs>

          {/* Línea base */}
          <line x1={0} y1={h - padB} x2={w} y2={h - padB} stroke="#2a2f3d" strokeWidth={1} />

          {values.map((v, i) => {
            const bh = v > 0 ? (v / max) * (h - padB - padT) : 0;
            const x = i * bw + (bw - barWidth) / 2;
            const y = h - padB - bh;
            const esActual = i === lastIndex;

            return (
              <g key={i}>
                {/* Valor sobre la barra, solo si tiene datos */}
                {v > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill={esActual ? "#7aa2ff" : "#8b93a1"}
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
                  fill={esActual ? "url(#barActual)" : "url(#barMuted)"}
                  style={{ transition: "height 0.35s ease, y 0.35s ease" }}
                />

                {/* Punto guía cuando el mes no tiene registros aún */}
                {v === 0 && <circle cx={x + barWidth / 2} cy={h - padB - 3} r={2} fill="#3f4657" />}

                <text
                  x={x + barWidth / 2}
                  y={h - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={esActual ? 700 : 400}
                  fill={esActual ? "#e2e5eb" : "#8b93a1"}
                  className="pointer-events-none"
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
