import { IconPackages } from "@tabler/icons-react";
import AnimatedNumber from "@/components/AnimatedNumber";

interface Box {
  name: string;
}

interface BoxBalancesProps {
  boxes: Box[];
  balancesByBox: Record<string, number>;
}

export default function BoxBalances({ boxes, balancesByBox }: BoxBalancesProps) {
  return (
    <div className="fn-card flex h-full min-h-0 flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
        Saldo por medio
      </h2>

      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-fn-line overflow-y-auto pr-1">
        {boxes.length === 0 && <li className="py-2 text-sm text-fn-muted">Sin medios</li>}

        {boxes.map((m) => {
          const balance = balancesByBox[m.name] || 0;
          return (
            <li key={m.name} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="fn-chip flex size-8 shrink-0 items-center justify-center rounded-full border border-fn-line">
                <IconPackages className="size-4 text-fn-text" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-fn-text">{m.name}</span>
              <span
                className={`shrink-0 font-semibold tabular-nums ${balance < 0 ? "text-negative" : "text-fn-text"}`}
              >
                <AnimatedNumber value={balance} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
