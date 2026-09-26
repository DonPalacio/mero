import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService, MedioSaldo } from "../services/dashboard.service";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";
import type { Categoria as CategoriaDB } from "@/features/categories/services/categories.service";
import { categoriasQuery, mediosQuery, movimientosQuery, queryKeys } from "@/lib/queries";

const SIN_MOVIMIENTOS: Movimiento[] = [];

export function useDashboard() {
  const queryClient = useQueryClient();
  const movimientosQ = useQuery(movimientosQuery);
  const categoriasQ = useQuery(categoriasQuery);
  const mediosQ = useQuery(mediosQuery);

  const movimientosTotales = movimientosQ.data ?? SIN_MOVIMIENTOS;
  const isLoading = movimientosQ.isPending || categoriasQ.isPending || mediosQ.isPending;

  const cajitas: Categoria[] = useMemo(
    () =>
      [...(categoriasQ.data ?? [])]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((c) => ({
          id: c.id,
          name: c.nombre,
          tipo: c.tipo,
          budget: Number(c.presupuesto_mensual),
        })),
    [categoriasQ.data],
  );

  // medios.saldo lo mantiene el trigger de la BD; se refresca al crear/eliminar movimientos
  const medios: MedioSaldo[] = useMemo(
    () =>
      (mediosQ.data ?? []).map((m) => ({ id: m.id, name: m.nombre, saldo: Number(m.saldo) })),
    [mediosQ.data],
  );

  // Estado para el mes actual
  const hoy = new Date();
  const mesActualInicial = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActualInicial);

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
      queryClient.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) =>
        old?.map((c) => (c.id === id ? { ...c, presupuesto_mensual: valor } : c)),
      );
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