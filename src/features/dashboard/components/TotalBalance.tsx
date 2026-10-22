import AnimatedNumber from "@/components/AnimatedNumber";
import { ACCENT_COLOR } from "./chartColors";

interface TotalBalanceProps {
  balancesByBox: Record<string, number>;
}

// Tarjeta destacada con el saldo de todos los medios juntos. El degradado es el mismo de las barras
// del BarChart (pierde fuerza hacia abajo); el texto es blanco fijo, en ambos temas.
export default function TotalBalance({ balancesByBox }: TotalBalanceProps) {
  const balances = Object.values(balancesByBox);
  const total = balances.reduce((sum, balance) => sum + balance, 0);

  return (
    <div
      className="fn-card flex h-full flex-col justify-between gap-6 p-4 text-white sm:p-5"
      style={{
        backgroundImage: `linear-gradient(to bottom, ${ACCENT_COLOR}, color-mix(in oklab, ${ACCENT_COLOR} 55%, transparent))`,
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Saldo total</h2>
      <div className="flex flex-col gap-1">
        <AnimatedNumber
          value={total}
          className="whitespace-nowrap text-base font-medium tracking-tight tabular-nums xl:text-lg"
        />
        <span className="text-xs opacity-80">
          {balances.length === 1 ? "En 1 medio" : `En ${balances.length} medios`}
        </span>
      </div>
    </div>
  );
}
