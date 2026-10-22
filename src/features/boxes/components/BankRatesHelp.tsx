import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconAlertTriangle, IconHelpCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  BANK_EA_RATES,
  BANK_EA_RATES_CHECKED_ON,
  formatBankRate,
  formatCheckedOn,
} from "../data/bank-ea-rates";

// Botón "?" junto al campo del E.A.: abre una ventana encima de la pantalla (no un globo anclado
// al botón) con las tasas de ahorro de las entidades más usadas en Colombia. Funciona igual en
// celular y en PC: centrada, con el fondo desenfocado y cerrable con la X, Esc o tocando fuera.
export default function BankRatesHelp({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Ver tasas E.A. de ahorro de las entidades"
          className={cn("fn-button-soft h-10 px-4", className)}
        >
          <IconHelpCircle className="h-5 w-5" />
          <span className="sm:hidden">Tasas de referencia</span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        {/* Fondo: oscurece y desenfoca apenas, para que se note que hay algo debajo */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className={cn(
            // Móvil primero: casi todo el ancho y alto (con margen de 16 px), centrada.
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden fn-card text-fn-text outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-fn-line px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold leading-snug tracking-tight text-fn-text">
              Tasas de referencia de ahorro en Colombia
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="fn-icon-button -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-fn-muted hover:text-fn-text"
            >
              <IconX className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-5">
            {/* Aviso principal: que no se confundan con créditos, CDT u otros productos */}
            <DialogPrimitive.Description asChild>
              <div
                role="note"
                className="flex gap-2 rounded-2xl border border-warning/50 bg-warning/10 p-3 text-fn-text"
              >
                <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed">
                  <strong className="font-bold uppercase">
                    Son tasas E.A. de rendimiento de ahorro.
                  </strong>{" "}
                  Corresponden a lo que pagan las cuentas de ahorro y bolsillos, no a créditos, CDT,
                  tarjetas ni a ningún otro producto.
                </p>
              </div>
            </DialogPrimitive.Description>

            <ul className="flex flex-col divide-y divide-fn-line">
              {BANK_EA_RATES.map((item) => (
                <li key={item.bank} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fn-text">{item.bank}</p>
                    <p className="text-xs text-fn-muted">{item.product}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-fn-text">
                    {formatBankRate(item.maxRate)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-[11px] leading-snug text-fn-muted">
              Publicadas por cada entidad y consultadas el{" "}
              {formatCheckedOn(BANK_EA_RATES_CHECKED_ON)}. Cambian con frecuencia y dependen del
              saldo y de las condiciones de cada producto; confírmalas con tu banco antes de
              decidir.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
