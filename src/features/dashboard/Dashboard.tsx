import PieChart from "./components/PieChart";
import BarChart from "./components/BarChart";
import Budgets from "./components/Budgets";
import MonthSelector from "./components/MonthSelector";
import SummaryStat from "./components/SummaryStat";
import TotalBalance from "./components/TotalBalance";
import BoxBalances from "./components/BoxBalances";
import { useDashboard } from "./hooks/useDashboard";

// Rejilla del rediseño: el mes y tres cifras arriba, cuatro tarjetas en medio y dos abajo.
const GRID =
  "grid grid-cols-1 gap-4 lg:gap-5 lg:grid-cols-[1.5fr_0.65fr_1.35fr_1.2fr] lg:auto-rows-min";
// El PieChart y el BarChart comparten ancho (primera columna) y alto en escritorio; los
// presupuestos, al lado del BarChart, usan ese mismo alto.
const SAME_SIZE = "lg:h-[26rem]";
// Móvil: "Queda" arriba a todo el ancho y las otras dos debajo; sin tarjeta, pero con el mismo aire.
const MOBILE_TILE = "max-sm:p-4";

export default function Dashboard() {
  const {
    selectedMonth,
    handlePrevMonth,
    handleNextMonth,
    categories,
    expensesByCategory,
    totalIncome,
    totalExpenses,
    availableBalance,
    balancesByBox,
    boxList,
    barLabels,
    barValues,
    handleBudgetChange,
    isLoading,
  } = useDashboard();

  if (isLoading) {
    return (
      // Esqueleto con la misma rejilla que la pantalla real: al cargar los datos no hay salto de
      // layout ni de color. El texto queda para lectores de pantalla.
      <div className="dash-brand flex flex-1 min-h-0 max-md:pb-0!">
        <div
          role="status"
          className="p-3 max-md:pb-24 md:p-8 rounded-tl-2xl border border-fn-line bg-fn-ground flex flex-col gap-4 flex-1 w-full h-full overflow-y-auto min-h-0"
        >
          <span className="sr-only">Cargando datos...</span>
          <div aria-hidden className={GRID}>
            <div className="skeleton-pulse fn-card h-24 lg:col-start-2" />
            <div className="skeleton-pulse fn-card h-24" />
            <div className="skeleton-pulse fn-card h-24" />
            <div className={`skeleton-pulse fn-card min-h-56 ${SAME_SIZE}`} />
            <div className="skeleton-pulse fn-card min-h-56" />
            <div className="skeleton-pulse fn-card min-h-56 lg:col-span-2" />
            <div className={`skeleton-pulse fn-card min-h-56 ${SAME_SIZE}`} />
            <div className={`skeleton-pulse fn-card min-h-72 lg:col-span-3 ${SAME_SIZE}`} />
          </div>
        </div>
      </div>
    );
  }

  // El espacio para el dock móvil lo reserva el scroll interno (`max-md:pb-24`), no este contenedor.
  return (
    <div className="dash-brand flex flex-1 min-h-0 max-md:pb-0!">
      <div className="p-3 max-md:pb-24 md:p-8 rounded-tl-2xl border border-fn-line bg-fn-ground text-fn-text flex flex-col gap-4 flex-1 w-full h-full overflow-y-auto min-h-0">
        <div className={GRID}>
          <div className="dash-enter [--i:0] lg:self-end">
            <MonthSelector
              selectedMonth={selectedMonth}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />
          </div>

          <div className="dash-enter [--i:1] grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:col-span-3 lg:grid-cols-3 lg:gap-5 lg:self-end">
            <SummaryStat
              label="Ingresos del mes"
              value={totalIncome}
              trend="up"
              className={MOBILE_TILE}
              valueClassName="max-sm:text-xl"
            />
            <SummaryStat
              label="Gastos del mes"
              value={totalExpenses}
              trend="down"
              className={MOBILE_TILE}
              valueClassName="max-sm:text-xl"
            />
            <SummaryStat
              label="Queda"
              value={availableBalance}
              trend="auto"
              className={`${MOBILE_TILE} max-sm:order-first max-sm:col-span-2`}
              valueClassName="max-sm:text-4xl"
            />
          </div>

          <div className={`dash-enter [--i:2] lg:col-start-1 ${SAME_SIZE}`}>
            <PieChart expensesByCategory={expensesByCategory} />
          </div>
          <div className={`dash-enter [--i:3] ${SAME_SIZE}`}>
            <TotalBalance balancesByBox={balancesByBox} />
          </div>
          <div className={`dash-enter [--i:4] lg:col-span-2 ${SAME_SIZE}`}>
            <BoxBalances boxes={boxList} balancesByBox={balancesByBox} />
          </div>

          <div className={`dash-enter [--i:5] lg:col-start-1 ${SAME_SIZE}`}>
            <BarChart labels={barLabels} values={barValues} />
          </div>
          <div className={`dash-enter [--i:6] lg:col-span-3 lg:col-start-2 ${SAME_SIZE}`}>
            <Budgets
              categories={categories}
              expensesByCategory={expensesByCategory}
              onBudgetChange={handleBudgetChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
