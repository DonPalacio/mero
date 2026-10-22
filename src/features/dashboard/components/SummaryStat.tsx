import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import AnimatedNumber from "@/components/AnimatedNumber";
import { cn } from "@/lib/utils";

interface SummaryStatProps {
  label: string;
  value: number;
  // "up" y "down" colorean la cifra del chip; "auto" lo decide el signo del valor.
  trend: "up" | "down" | "auto";
  // Ajustes de la vista móvil (tarjeta, ancho y tamaño de la cifra); en escritorio no se usan.
  className?: string;
  valueClassName?: string;
}

// Cifra grande sobre el fondo, con su etiqueta arriba y un chip con flecha al lado.
export default function SummaryStat({
  label,
  value,
  trend,
  className,
  valueClassName,
}: SummaryStatProps) {
  const isUp = trend === "auto" ? value >= 0 : trend === "up";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs text-fn-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <AnimatedNumber
          value={value}
          className={cn(
            "whitespace-nowrap text-2xl font-medium tracking-tight tabular-nums xl:text-3xl",
            trend === "auto" && !isUp ? "text-negative" : "text-fn-text",
            valueClassName,
          )}
        />
        <span
          className={`flex h-5 items-center rounded-full px-1.5 ${isUp ? "bg-success/15 text-success" : "bg-negative/15 text-negative"}`}
        >
          {isUp ? (
            <IconArrowUpRight className="size-3.5" aria-hidden />
          ) : (
            <IconArrowDownRight className="size-3.5" aria-hidden />
          )}
        </span>
      </div>
    </div>
  );
}
