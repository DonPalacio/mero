import React from "react";
import Summary from "./components/Summary";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import Budgets from "./components/Budgets";
import { useDashboard } from "./hooks/useDashboard";

export default function Dashboard() {
  const {
    selectedMonth,
    handlePrevMonth,
    handleNextMonth,
    categories,
    expensesByCategory,
    totalIncome,
    monthYields,
    totalExpenses,
    availableBalance,
    isLoading,
    handleBudgetChange,
    balancesByBox,
    boxList,
    barLabels,
    barValues,
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
          <div
            aria-hidden
            className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-4 lg:gap-5 flex-1 lg:min-h-0"
          >
            <div className="skeleton-pulse fn-card min-h-72 lg:row-span-2" />
            <div className="skeleton-pulse fn-card min-h-72 lg:col-start-2 lg:row-start-1" />
            <div className="skeleton-pulse fn-card min-h-72 lg:col-start-3 lg:row-start-1" />
            <div className="skeleton-pulse fn-card min-h-40 lg:col-span-2 lg:col-start-2 lg:row-start-2" />
          </div>
        </div>
      </div>
    );
  }

  // El espacio para el dock móvil lo reserva el scroll interno (`max-md:pb-24`), no este contenedor.
  return (
    <div className="dash-brand flex flex-1 min-h-0 max-md:pb-0!">
      <div className="p-3 max-md:pb-24 md:p-8 rounded-tl-2xl border border-fn-line bg-fn-ground text-fn-text flex flex-col gap-4 flex-1 w-full h-full overflow-y-auto min-h-0">
        {/* Resumen a la izquierda a toda la altura; a la derecha, gráficos arriba y presupuestos abajo. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-4 lg:gap-5 flex-1 lg:min-h-0">
          <div className="dash-enter [--i:0] lg:row-span-2 lg:min-h-0">
            <Summary
              selectedMonth={selectedMonth}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              income={totalIncome}
              yields={monthYields}
              expenses={totalExpenses}
              remaining={availableBalance}
              cmpColor="#3fb27f"
              boxes={boxList}
              balancesByBox={balancesByBox}
            />
          </div>

          <div className="dash-enter [--i:1] lg:col-start-2 lg:row-start-1 lg:min-h-0">
            <PieChart expensesByCategory={expensesByCategory} />
          </div>

          <div className="dash-enter [--i:2] lg:col-start-3 lg:row-start-1 lg:min-h-0">
            <BarChart labels={barLabels} values={barValues.map((value) => value ?? 0)} />
          </div>

          <div className="dash-enter [--i:3] lg:col-span-2 lg:col-start-2 lg:row-start-2 lg:min-h-0">
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
