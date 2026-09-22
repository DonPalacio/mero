interface BarChartProps {
  labels: string[];
  values: number[];
}

export default function BarChart({ labels, values }: BarChartProps) {
  const max = Math.max(...values, 1);
  const w = 280,
    h = 220,
    padB = 24,
    padT = 10;
  const bw = w / values.length;

  return (
    <div className="rounded-3xl bg-card border border-border p-4 flex flex-col gap-4 w-full h-full">
      <h2 className="text-foreground font-semibold text-lg">Últimos 6 meses</h2>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
          {values.map((v, i) => {
            const bh = (v / max) * (h - padB - padT);
            const x = i * bw + bw * 0.2;
            const y = h - padB - bh;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={bw * 0.6}
                  height={bh}
                  rx={3}
                  fill="#5b8def"
                />
                <text
                  x={x + bw * 0.3}
                  y={h - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#8b93a1"
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