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
      <div className="flex flex-1 items-center justify-center bg-background h-screen text-muted-foreground">
        <p className="animate-pulse text-sm">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-border bg-background flex flex-col gap-4 lg:gap-2 flex-1 w-full h-full overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-5 gap-4 lg:gap-2 flex-1 min-h-0">
          <div className="col-span-1 lg:col-span-2 lg:row-span-3">
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

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-3 lg:row-start-1">
            <PieChart expensesByCategory={expensesByCategory} />
          </div>

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-5 lg:row-start-1">
            <BarChart labels={barLabels} values={barValues.map((value) => value ?? 0)} />
          </div>

          <div className="col-span-1 lg:col-span-6 lg:row-span-2 lg:col-start-1 lg:row-start-4 lg:min-h-0">
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
