import { useState, useEffect } from "react";
import { dashboardService } from "../services/dashboard.service";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";

export function useDashboard() {
  const [movimientosTotales, setMovimientosTotales] = useState<Movimiento[]>([]);
  const [cajitas, setCajitas] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Estado para el mes actual (Por defecto, el mes actual del sistema)
  const hoy = new Date();
  const mesActualInicial = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActualInicial);

  useEffect(() => {
    async function cargarDatos() {
      try {
        setIsLoading(true);
        const [movsData, cajitasData] = await Promise.all([
          dashboardService.obtenerMovimientos(),
          dashboardService.obtenerCajitas(),
        ]);

        setMovimientosTotales(movsData);
        setCajitas(cajitasData);
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    cargarDatos();
  }, []);

  // 2. Funciones manejadoras de los botones del mes
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 2);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  // 3. Filtramos los movimientos SOLO para el mes seleccionado
  const movimientosDelMes = movimientosTotales.filter((m) => m.fecha.startsWith(selectedMonth));

  // 4. Calculamos en base a los movimientos filtrados de ese mes
  const gastosPorCajita = movimientosDelMes
    .filter((m) => m.tipo === "gasto")
    .reduce(
      (acumulador, mov) => {
        acumulador[mov.cajita] = (acumulador[mov.cajita] || 0) + mov.monto;
        return acumulador;
      },
      {} as Record<string, number>,
    );

  const ingresosTotales = movimientosDelMes
    .filter((m) => m.tipo === "ingreso")
    .reduce((sum, m) => sum + m.monto, 0);

  const gastosTotales = movimientosDelMes
    .filter((m) => m.tipo === "gasto")
    .reduce((sum, m) => sum + m.monto, 0);

  const saldoDisponible = ingresosTotales - gastosTotales;

  const handleBudgetChange = (name: string, value: string) => {
    console.log(`Actualizar presupuesto de ${name} a ${value}`);
  };

  return {
    selectedMonth, // Nuevo export
    handlePrevMonth, // Nuevo export
    handleNextMonth, // Nuevo export
    cajitas,
    gastosPorCajita,
    ingresosTotales,
    gastosTotales,
    saldoDisponible,
    isLoading,
    handleBudgetChange,
  };
}
