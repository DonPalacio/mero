import { useState, useEffect, useMemo } from "react";
import { dashboardService, MedioSaldo } from "../services/dashboard.service";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";

export function useDashboard() {
  const [movimientosTotales, setMovimientosTotales] = useState<Movimiento[]>([]);
  const [cajitas, setCajitas] = useState<Categoria[]>([]);
  const [medios, setMedios] = useState<MedioSaldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para el mes actual
  const hoy = new Date();
  const mesActualInicial = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActualInicial);

  useEffect(() => {
    async function cargarDatos() {
      try {
        setIsLoading(true);
        const [movsData, cajitasData, mediosData] = await Promise.all([
          dashboardService.obtenerMovimientos(),
          dashboardService.obtenerCajitas(),
          dashboardService.obtenerMedios(),
        ]);

        setMovimientosTotales(movsData);
        setCajitas(cajitasData);
        setMedios(mediosData);
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
  // Solo cuentan los movimientos QUE TIENEN CATEGORÍA (traspasos sin
  // categoría quedan afuera a propósito).
  // --------------------------------------------------------
  const movimientosDelMes = movimientosTotales.filter((m) => m.fecha.startsWith(selectedMonth));

  const gastosPorCajita = movimientosDelMes
    .filter((m) => m.tipo === "gasto" && m.cajita)
    .reduce(
      (acumulador, mov) => {
        acumulador[mov.cajita] = (acumulador[mov.cajita] || 0) + mov.monto;
        return acumulador;
      },
      {} as Record<string, number>,
    );

  const ingresosTotales = movimientosDelMes
    .filter((m) => m.tipo === "ingreso" && m.cajita)
    .reduce((sum, m) => sum + m.monto, 0);

  const gastosTotales = movimientosDelMes
    .filter((m) => m.tipo === "gasto" && m.cajita)
    .reduce((sum, m) => sum + m.monto, 0);

  const saldoDisponible = ingresosTotales - gastosTotales;

  // --------------------------------------------------------
  // SALDO POR MEDIO: viene directo de medios.saldo (lo calcula el
  // trigger de la BD con TODOS los movimientos, tengan o no categoría).
  // Así se ven todos los medios creados, incluso sin movimientos.
  // --------------------------------------------------------
  const listaMedios = medios.map((m) => ({ name: m.name }));
  const saldosPorMedio = medios.reduce(
    (acumulador, m) => {
      acumulador[m.name] = m.saldo;
      return acumulador;
    },
    {} as Record<string, number>,
  );

  // --------------------------------------------------------
  // HISTÓRICO PARA EL BARCHART: siempre los 6 meses que terminan en
  // selectedMonth (el mes que estás navegando en Summary), aunque
  // algunos no tengan movimientos todavía (se muestran en 0).
  // --------------------------------------------------------
  const metricasGlobales = useMemo(() => {
    const [selYear = hoy.getFullYear(), selMonthNum = hoy.getMonth() + 1] = selectedMonth
      .split("-")
      .map(Number);

    const ultimosSeisMeses: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selYear, selMonthNum - 1 - i, 1);
      ultimosSeisMeses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const gastosPorMesCalc: Record<string, number> = {};
    movimientosTotales.forEach((mov) => {
      if (mov.tipo === "gasto" && mov.cajita) {
        const mesMov = mov.fecha.substring(0, 7);
        gastosPorMesCalc[mesMov] = (gastosPorMesCalc[mesMov] || 0) + mov.monto;
      }
    });

    const barLabels = ultimosSeisMeses.map((m) => {
      const [year, month] = m.split("-").map(Number);
      const date = new Date(year ?? hoy.getFullYear(), (month ?? hoy.getMonth() + 1) - 1);
      return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
    });
    const barValues = ultimosSeisMeses.map((m) => gastosPorMesCalc[m] || 0);

    return { barLabels, barValues };
  }, [movimientosTotales, selectedMonth]);

  const handleBudgetChange = async (id: string, value: string) => {
    const valor = parseFloat(value);
    if (isNaN(valor) || valor < 0) return;

    const exito = await dashboardService.actualizarPresupuesto(id, valor);
    if (exito) {
      setCajitas((prev) => prev.map((c) => (c.id === id ? { ...c, budget: valor } : c)));
    }
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
    saldosPorMedio,
    listaMedios,
    barLabels: metricasGlobales.barLabels,
    barValues: metricasGlobales.barValues,
  };
}