import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { monthLabelText } from "@/lib/utils";

interface MonthSelectorProps {
  selectedMonth: string; // formato "YYYY-MM"
  onPrev: () => void;
  onNext: () => void;
}

// Mes en grande sobre el fondo (sin tarjeta). Las flechas van antes del nombre para que no se muevan
// cuando cambia su largo ("Mayo" frente a "Septiembre").
export default function MonthSelector({ selectedMonth, onPrev, onNext }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-3 max-sm:w-full">
      {/* En móvil el grupo se disuelve (`contents`) y `order` deja las flechas a los lados del mes. */}
      <div className="flex shrink-0 items-center gap-1 max-sm:contents">
        <button
          aria-label="Mes anterior"
          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text max-sm:order-1 max-sm:size-10"
          onClick={onPrev}
        >
          <IconChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          aria-label="Mes siguiente"
          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-text max-sm:order-3 max-sm:size-10"
          onClick={onNext}
        >
          <IconChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <h2 className="min-w-0 text-2xl font-medium tracking-tight text-fn-text max-sm:order-2 max-sm:flex-1 max-sm:text-center sm:text-3xl">
        <span key={selectedMonth} className="label-swap inline-block whitespace-nowrap">
          {monthLabelText(selectedMonth)}
        </span>
      </h2>
    </div>
  );
}
