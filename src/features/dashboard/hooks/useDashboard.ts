import { useState, useEffect, useMemo } from "react";
import { dashboardService } from "../services/dashboard.service";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";

export function useDashboard() {
  const [movimientosTotales, setMovimientosTotales] = useState<Movimiento[]>([]);
  const [cajitas, setCajitas] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para el mes actual
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

  const handlePrevMonth = () => {
    const [year = hoy.getFullYear(), month = hoy.getMonth() + 1] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 2);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year = hoy.getFullYear(), month = hoy.getMonth() + 1] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  // --------------------------------------------------------
  // CÁLCULOS DEL MES SELECCIONADO (Summary, PieChart, Presupuestos)
  // --------------------------------------------------------
  const movimientosDelMes = movimientosTotales.filter((m) => m.fecha.startsWith(selectedMonth));

  const gastosPorCajita = movimientosDelMes
    .filter((m) => m.tipo === "gasto" && m.cajita) // Solo suman si tienen cajita (categoría)
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

  // --------------------------------------------------------
  // CÁLCULOS HISTÓRICOS GLOBALES (Saldos por medio y BarChart)
  // --------------------------------------------------------
  const metricasGlobales = useMemo(() => {
    const saldosCalc: Record<string, number> = {};
    const gastosPorMesCalc: Record<string, number> = {};

    movimientosTotales.forEach((mov) => {
      // 1. Calcular Saldos por Medio (Afecta ingresos y gastos, sin importar la categoría)
      if (mov.medio) {
        if (!saldosCalc[mov.medio]) saldosCalc[mov.medio] = 0;
        saldosCalc[mov.medio] =
          (saldosCalc[mov.medio] ?? 0) + (mov.tipo === "ingreso" ? mov.monto : -mov.monto);
      }

      // 2. Agrupar gastos por mes para el BarChart (Solo suman si tienen cajita)
      if (mov.tipo === "gasto" && mov.cajita) {
        const mesMov = mov.fecha.substring(0, 7);
        if (!gastosPorMesCalc[mesMov]) gastosPorMesCalc[mesMov] = 0;
        gastosPorMesCalc[mesMov] += mov.monto;
      }
    });

    // Formatear Lista de Medios para el componente Summary
    const listaMedios = Object.keys(saldosCalc).map((name) => ({ name }));

    // Formatear datos para el BarChart (Últimos 6 meses ordenados cronológicamente)
    const mesesOrdenados = Object.keys(gastosPorMesCalc).sort().slice(-6);

    const barLabels = mesesOrdenados.map((m) => {
      const [year = hoy.getFullYear(), month = hoy.getMonth() + 1] = m.split("-").map(Number);
      const date = new Date(year, month - 1);
      return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
    });
    const barValues = mesesOrdenados.map((m) => gastosPorMesCalc[m]);

    return { saldosCalc, listaMedios, barLabels, barValues };
  }, [movimientosTotales]);

  const handleBudgetChange = (name: string, value: string) => {
    console.log(`Actualizar presupuesto de ${name} a ${value}`);
  };

  return {
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
    // Exportamos los nuevos cálculos globales
    saldosPorMedio: metricasGlobales.saldosCalc,
    listaMedios: metricasGlobales.listaMedios,
    barLabels: metricasGlobales.barLabels,
    barValues: metricasGlobales.barValues,
  };
}
