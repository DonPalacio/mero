import React from "react";
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
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring",
            className,
          )}
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
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="text-base font-semibold leading-snug text-foreground">
              Tasas de referencia de ahorro en Colombia
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <IconX className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {/* Aviso principal: que no se confundan con créditos, CDT u otros productos */}
            <DialogPrimitive.Description asChild>
              <div
                role="note"
                className="flex gap-2 rounded-lg border border-amber-500/60 bg-amber-500/15 p-3 text-amber-100"
              >
                <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed">
                  <strong className="font-bold uppercase">
                    Son tasas E.A. de rendimiento de ahorro.
                  </strong>{" "}
                  Corresponden a lo que pagan las cuentas de ahorro y bolsillos, no a créditos, CDT,
                  tarjetas ni a ningún otro producto.
                </p>
              </div>
            </DialogPrimitive.Description>

            <ul className="flex flex-col divide-y divide-border">
              {BANK_EA_RATES.map((item) => (
                <li key={item.bank} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.bank}</p>
                    <p className="text-xs text-muted-foreground">{item.product}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatBankRate(item.maxRate)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-[11px] leading-snug text-muted-foreground">
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
