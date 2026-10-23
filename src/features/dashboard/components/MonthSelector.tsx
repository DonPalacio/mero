import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { monthLabelText } from "@/lib/utils";

interface MonthSelectorProps {
  selectedMonth: string; // formato "YYYY-MM"
  onPrev: () => void;
  onNext: () => void;
}

// Mes en grande sobre el fondo (sin tarjeta). Las flechas van antes del nombre para que no se muevan
// cuando cambia su largo ("Mayo" frente a "Septiembre"). En móvil todo va dentro de una píldora clara
// de ancho fijo y centrada: las flechas quedan fijas en los extremos y el nombre, centrado, entra deslizándose
// desde el lado hacia el que se navega.
export default function MonthSelector({ selectedMonth, onPrev, onNext }: MonthSelectorProps) {
  const [direction, setDirection] = useState<"prev" | "next">("next");

  return (
    <div className="flex items-center gap-3 max-sm:mx-auto max-sm:w-[17.5rem] max-sm:gap-2 max-sm:rounded-full max-sm:bg-fn-text max-sm:p-1 max-sm:text-fn-ground">
      {/* En móvil el grupo se disuelve (`contents`) y `order` deja las flechas a los lados del mes. */}
      <div className="flex shrink-0 items-center gap-1 max-sm:contents">
        <button
          aria-label="Mes anterior"
          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text max-sm:order-1 max-sm:size-9 max-sm:border-zinc-400 max-sm:bg-fn-text max-sm:text-zinc-500 max-sm:hover:bg-fn-text max-sm:active:scale-90"
          onClick={() => {
            setDirection("prev");
            onPrev();
          }}
        >
          <IconChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          aria-label="Mes siguiente"
          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text max-sm:order-3 max-sm:size-9 max-sm:border-zinc-400 max-sm:bg-fn-text max-sm:text-zinc-500 max-sm:hover:bg-fn-text max-sm:active:scale-90"
          onClick={() => {
            setDirection("next");
            onNext();
          }}
        >
          <IconChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <h2 className="min-w-0 overflow-hidden text-base font-medium tracking-tight text-fn-text max-sm:order-2 max-sm:flex-1 max-sm:text-center max-sm:text-fn-ground sm:overflow-visible sm:text-3xl">
        <span
          key={selectedMonth}
          className={`inline-block whitespace-nowrap sm:label-swap ${direction === "next" ? "max-sm:month-in-next" : "max-sm:month-in-prev"}`}
        >
          {monthLabelText(selectedMonth)}
        </span>
      </h2>
    </div>
  );
}
