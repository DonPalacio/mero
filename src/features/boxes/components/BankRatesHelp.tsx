import React from "react";
import { IconAlertTriangle, IconHelpCircle } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BANK_EA_RATES,
  BANK_EA_RATES_CHECKED_ON,
  formatBankRate,
  formatCheckedOn,
} from "../data/bank-ea-rates";

// Botón "?" junto al campo del E.A.: abre una lista flotante con las tasas de ahorro de los
// bancos más usados en Colombia, para tener una referencia al escribir el porcentaje.
export default function BankRatesHelp({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ver tasas E.A. de ahorro de los bancos"
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-input bg-zinc-800 px-4 text-sm text-foreground transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-ring",
            className,
          )}
        >
          <IconHelpCircle className="h-5 w-5" />
          <span className="sm:hidden">Tasas de referencia</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto p-0"
      >
        <div className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Tasas de referencia de ahorro en Colombia
          </h2>

          {/* Aviso principal: que no se confundan con créditos, CDT u otros productos */}
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
            Consultadas en las páginas oficiales de cada banco el{" "}
            {formatCheckedOn(BANK_EA_RATES_CHECKED_ON)}. Cambian con frecuencia y dependen del saldo
            y de las condiciones de cada producto; confírmalas con tu banco antes de decidir.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
