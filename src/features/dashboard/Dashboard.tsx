import React from "react";
import Summary from "./components/Summary";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import Budgets from "./components/Budgets";
import { useDashboard } from "./hooks/useDashboard";

export default function Dashboard() {
  // 1. Traemos toda la lógica desde el custom hook
  const { 
    gastosPorCajita, 
    categoriasDePrueba, 
    handleBudgetChange 
  } = useDashboard();

  // 2. Renderizado puro de UI
  return (
    <div className="flex flex-1 min-h-0">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-border bg-background flex flex-col gap-4 lg:gap-2 flex-1 w-full h-full overflow-y-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-5 gap-4 lg:gap-2 flex-1">
          
          <div className="col-span-1 lg:col-span-2 lg:row-span-3">
            <Summary
              selectedMonth="2026-09"
              onPrev={() => {}}
              onNext={() => {}}
              ingresos={4500000}
              gastos={3200000}
              queda={1300000}
              cmpText="12% menos que el promedio"
              cmpColor="#3fb27f"
              medios={[{ name: "Efectivo" }, { name: "Nu" }]}
              saldosPorMedio={{ Efectivo: 200000, Nu: 1100000 }}
            />
          </div>

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-3 lg:row-start-1">
            <PieChart gastosPorCajita={gastosPorCajita} />
          </div>

          <div className="col-span-1 lg:col-span-2 lg:row-span-3 lg:col-start-5 lg:row-start-1">
            <BarChart
              labels={["Mar", "Abr", "May", "Jun", "Jul", "Ago"]}
              values={[2100000, 2800000, 1900000, 3100000, 2400000, 3200000]}
            />
          </div>

          <div className="col-span-1 lg:col-span-6 lg:row-span-2 lg:col-start-1 lg:row-start-4">
            <Budgets 
              categorias={categoriasDePrueba}
              gastosPorCajita={gastosPorCajita}
              onBudgetChange={handleBudgetChange}
            />
          </div>

        </div>
      </div>
    </div>
  );
}