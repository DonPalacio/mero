import { useId, useState } from "react";
import { fmt } from "@/lib/utils";
import { ACCENT_COLOR } from "./chartColors";

interface BarChartProps {
  labels: string[];
  values: number[];
}

// Cifra corta para el eje: 1,2M / 350k / 80.
function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export default function BarChart({ labels, values }: BarChartProps) {
  const max = Math.max(...values, 1);
  const w = 300,
    h = 230,
    padL = 34,
    padR = 14,
    padB = 28,
    padT = 40;
  const bw = (w - padL - padR) / values.length;
  const barWidth = bw * 0.64;
  const lastIndex = values.length - 1;
  const trackH = h - padB - padT;
  // Con mouse, la barra activa sigue al cursor y, sin cursor encima, es la del mes actual (la última).
  // En pantallas táctiles no hay "hover": al soltar el dedo el navegador dispara pointerleave, que
  // devolvía al mes actual al instante; por eso un toque deja la barra elegida hasta el siguiente.
  const [hovered, setHovered] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const active = hovered ?? tapped ?? lastIndex;
  // Ids únicos por instancia para que los patrones no choquen si el gráfico se monta dos veces.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `${uid}-bar`;
  const hatchId = `${uid}-hatch`;

  const ticks = [0, 0.5, 1].map((t) => ({ y: h - padB - t * trackH, label: compact(max * t) }));

  return (
    <div className="fn-card flex h-full w-full flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
        Gastos últimos 6 meses
      </h2>
      <div className="flex min-h-[220px] flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: "100%", height: "100%" }}
          role="img"
          aria-label="Gastos de los últimos 6 meses"
        >
          <defs>
            {/* Degradado vertical: la barra activa pierde fuerza hacia la base sin añadir otro tono. */}
            <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={ACCENT_COLOR} />
              <stop offset="1" stopColor={ACCENT_COLOR} stopOpacity={0.55} />
            </linearGradient>
            {/* Rayado diagonal de las barras inactivas */}
            <pattern
              id={hatchId}
              width={5}
              height={5}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={5}
                className="stroke-fn-muted"
                strokeWidth={1.5}
                opacity={0.45}
              />
            </pattern>
          </defs>

          {/* Eje vertical: solo cifras, sin líneas */}
          {ticks.map((tick) => (
            <text
              key={tick.y}
              x={0}
              y={tick.y + 4}
              fontSize={10}
              className="fill-fn-muted"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {tick.label}
            </text>
          ))}

          {values.map((v, i) => {
            const bh = v > 0 ? Math.max((v / max) * trackH, 8) : 0;
            const x = padL + i * bw + (bw - barWidth) / 2;
            const y = h - padB - bh;
            const isActive = i === active;

            const tip = fmt(v);
            const tipW = tip.length * 5.3 + 14;
            const tipX = Math.min(Math.max(x + barWidth / 2, tipW / 2), w - tipW / 2);

            return (
              <g
                key={i}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setHovered(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setHovered(null);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== "mouse") setTapped(i);
                }}
              >
                <title>{`${labels[i]}: ${tip}`}</title>
                {/* Zona de contacto de toda la columna, para activar la barra sin apuntar con precisión */}
                <rect
                  x={padL + i * bw}
                  y={padT}
                  width={bw}
                  height={trackH + padB}
                  fill="transparent"
                />

                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={bh}
                  rx={barWidth / 2}
                  className="bar-rise transition-[y,height] duration-300 ease-out motion-reduce:transition-none"
                  fill={isActive ? `url(#${fillId})` : `url(#${hatchId})`}
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

                {isActive && v > 0 && (
                  <>
                    <circle
                      cx={x + barWidth / 2}
                      cy={y + barWidth / 2}
                      r={2.5}
                      className="fill-fn-ground"
                    />
                    <rect
                      x={tipX - tipW / 2}
                      y={y - 26}
                      width={tipW}
                      height={18}
                      rx={9}
                      className="fill-fn-text"
                    />
                    <text
                      x={tipX}
                      y={y - 13.5}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={600}
                      className="fill-fn-ground"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {tip}
                    </text>
                  </>
                )}

                <text
                  x={x + barWidth / 2}
                  y={h - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={isActive ? 700 : 400}
                  className={`pointer-events-none ${isActive ? "fill-fn-text" : "fill-fn-muted"}`}
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
