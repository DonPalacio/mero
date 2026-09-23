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
    cajitas,
    gastosPorCajita,
    ingresosTotales,
    gastosTotales,
    saldoDisponible,
    isLoading,
    handleBudgetChange,
    saldosPorMedio,
    listaMedios,
    barLabels,
    barValues,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background h-screen text-muted-foreground">
        <p className="animate-pulse text-sm">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-border bg-background flex flex-col gap-4 lg:gap-2 flex-1 w-full h-full overflow-y-auto">

        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-5 gap-4 lg:gap-2 flex-1">
          <div className="col-span-1 lg:col-span-2 lg:row-span-3">
            <Summary
              selectedMonth={selectedMonth}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              ingresos={ingresosTotales}
              gastos={gastosTotales}
              queda={saldoDisponible}
              cmpText="Datos en tiempo real"
              cmpColor="#3fb27f"
              medios={listaMedios}
              saldosPorMedio={saldosPorMedio}
            />
          </div>

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-3 lg:row-start-1">
            <PieChart gastosPorCajita={gastosPorCajita} />
          </div>

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-5 lg:row-start-1">
            <BarChart
              labels={barLabels}
              values={barValues.map((value) => value ?? 0)}
            />
          </div>

          <div className="col-span-1 lg:col-span-6 lg:row-span-2 lg:col-start-1 lg:row-start-4">
            <Budgets
              categorias={cajitas}
              gastosPorCajita={gastosPorCajita}
              onBudgetChange={handleBudgetChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
