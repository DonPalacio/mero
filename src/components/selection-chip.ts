import { cn } from "@/lib/utils";

// Chip de selección (categoría y medio de pago): el activo lleva el relleno suave del selector
// Gasto/Ingreso y un ✓, no solo color.
export const chipClass = (isActive: boolean) =>
  cn(
    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
    isActive
      ? "border-transparent bg-foreground/20 text-fn-text"
      : "border-fn-line bg-fn-chip text-fn-muted hover:bg-fn-chip-hover hover:text-fn-text",
  );
