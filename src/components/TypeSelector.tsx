import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type MovementType = "expense" | "income";

interface TypeSelectorProps {
  value: MovementType;
  onChange: (value: MovementType) => void;
  className?: string;
}

const OPTIONS = [
  { value: "expense", label: "Gasto", Icon: IconArrowDownRight, tone: "text-negative" },
  { value: "income", label: "Ingreso", Icon: IconArrowUpRight, tone: "text-success" },
] as const;

// Selector Gasto / Ingreso: como el conmutador de la referencia, una píldora de relleno suave se
// desliza entre las dos opciones (solo transform, con prefers-reduced-motion) y cada opción lleva
// el ícono de su tipo más su texto, así que el tipo no depende solo del color.
export default function TypeSelector({ value, onChange, className }: TypeSelectorProps) {
  return (
    <div className={cn("relative flex rounded-full fn-chip border border-fn-line", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full bg-foreground/20 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          value === "income" && "translate-x-full",
        )}
      />
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
              active ? "text-fn-text" : "text-fn-muted hover:text-fn-text",
            )}
            onClick={() => onChange(option.value)}
          >
            <option.Icon className={cn("size-4", option.tone)} aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
