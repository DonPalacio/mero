import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService, BoxBalance, type SummaryRow } from "../services/dashboard.service";
import { Category } from "../components/Budgets";
import { toast } from "sonner";
import type { OperationResult } from "@/lib/supabase-errors";
import {
  CHART_MONTHS,
  updateBudgetOptimistic,
  toMonthKey,
  categoriesQuery,
  boxesQuery,
  monthlyYieldsQuery,
  monthlySummaryQuery,
} from "@/lib/queries";

// Referencia estable para el memo mientras el resumen aún no llega.
const NO_SUMMARY: SummaryRow[] = [];

export function useDashboard() {
  const queryClient = useQueryClient();

  // Estado para el mes actual
  const today = new Date();
  const initialCurrentMonth = toMonthKey(today);
  const [selectedMonth, setSelectedMonth] = useState(initialCurrentMonth);

  // Los CHART_MONTHS meses que terminan en selectedMonth (el más antiguo primero),
  // aunque algunos no tengan movimientos todavía.
  const lastSixMonths = useMemo(() => {
    const [selYear = 0, selMonthNum = 1] = selectedMonth.split("-").map(Number);

    const months: string[] = [];
    for (let i = CHART_MONTHS - 1; i >= 0; i--) {
      months.push(toMonthKey(new Date(selYear, selMonthNum - 1 - i, 1)));
    }
    return months;
  }, [selectedMonth]);

  // Una sola consulta agregada en la BD (monthly_summary) con los totales de esos meses,
  // en lugar de descargar todos sus movimientos para sumarlos aquí.
  const summaryQ = useQuery(monthlySummaryQuery(selectedMonth));
  const categoriesQ = useQuery(categoriesQuery);
  const boxesQ = useQuery(boxesQuery);
  // Pesos generados por E.A. en el mes. No bloquea la pantalla: mientras llega (o si la BD aún
  // no tiene la función) cuenta como 0 y los ingresos se ven igual que antes.
  const yieldsQ = useQuery(monthlyYieldsQuery(selectedMonth));

  const isLoading = summaryQ.isPending || categoriesQ.isPending || boxesQ.isPending;

  // Precarga el resumen del mes anterior y del siguiente (sin pasar del actual), para que
  // navegar de mes no espere a la red. Espera a que carguen los datos de la pantalla: así no
  // compite con ellos por la conexión.
  useEffect(() => {
    if (isLoading) return;

    const [yearNumber = 0, monthNumber = 1] = selectedMonth.split("-").map(Number);
    [new Date(yearNumber, monthNumber - 2, 1), new Date(yearNumber, monthNumber, 1)]
      .map(toMonthKey)
      .filter((month) => month <= initialCurrentMonth)
      .forEach((month) => {
        queryClient.prefetchQuery(monthlySummaryQuery(month));
        queryClient.prefetchQuery(monthlyYieldsQuery(month));
      });
  }, [selectedMonth, initialCurrentMonth, queryClient, isLoading]);

  const categories: Category[] = useMemo(
    () =>
      [...(categoriesQ.data ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          budget: Number(c.monthly_budget),
        })),
    [categoriesQ.data],
  );

  // boxes.balance lo mantiene el trigger de la BD; se refresca al crear/eliminar movimientos
  const boxes: BoxBalance[] = useMemo(
    () => (boxesQ.data ?? []).map((m) => ({ id: m.id, name: m.name, balance: Number(m.balance) })),
    [boxesQ.data],
  );

  const handlePrevMonth = () => {
    const [year = today.getFullYear(), month = today.getMonth() + 1] = selectedMonth
      .split("-")
      .map(Number);
    const date = new Date(year, month - 2);
    setSelectedMonth(toMonthKey(date));
  };

  const handleNextMonth = () => {
    const [year = today.getFullYear(), month = today.getMonth() + 1] = selectedMonth
      .split("-")
      .map(Number);
    const date = new Date(year, month);
    setSelectedMonth(toMonthKey(date));
  };

  // --------------------------------------------------------
  // CÁLCULOS A PARTIR DEL RESUMEN (Summary, PieChart, Presupuestos, BarChart)
  // La BD ya sumó por mes, tipo y categoría, y solo cuenta los movimientos QUE TIENEN
  // CATEGORÍA (traspasos sin categoría quedan afuera a propósito). Aquí cada categoría
  // se traduce a su nombre; una que ya no existe en la lista se ignora.
  // --------------------------------------------------------
  const nameByCategory = useMemo(
    () => new Map((categoriesQ.data ?? []).map((c) => [c.id, c.name])),
    [categoriesQ.data],
  );

  const { expensesByCategory, totalIncome, totalExpenses, expensesByMonth } = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    const expensesByMonth: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of summaryQ.data ?? NO_SUMMARY) {
      const name = nameByCategory.get(row.categoryId);
      if (!name) continue;

      if (row.type === "expense") {
        expensesByMonth[row.month] = (expensesByMonth[row.month] || 0) + row.total;
      }
      if (row.month !== selectedMonth) continue;

      if (row.type === "income") {
        totalIncome += row.total;
      } else {
        totalExpenses += row.total;
        expensesByCategory[name] = (expensesByCategory[name] || 0) + row.total;
      }
    }

    return { expensesByCategory, totalIncome, totalExpenses, expensesByMonth };
  }, [summaryQ.data, nameByCategory, selectedMonth]);

  // Los rendimientos E.A. no son movimientos (no tienen categoría): se suman aparte, y como
  // son ingresos del mes también suben "Queda". Los gastos no cambian.
  const monthYields = useMemo(
    () => yieldsQ.data?.find((f) => f.month === selectedMonth)?.total ?? 0,
    [yieldsQ.data, selectedMonth],
  );
  const monthIncome = totalIncome + monthYields;
  const availableBalance = monthIncome - totalExpenses;

  // --------------------------------------------------------
  // SALDO POR MEDIO: viene directo de boxes.balance (lo calcula el
  // trigger de la BD con TODOS los movimientos, tengan o no categoría).
  // Así se ven todos los medios creados, incluso sin movimientos.
  // --------------------------------------------------------
  const boxList = boxes.map((m) => ({ name: m.name }));
  const balancesByBox = boxes.reduce(
    (accumulator, m) => {
      accumulator[m.name] = m.balance;
      return accumulator;
    },
    {} as Record<string, number>,
  );

  // --------------------------------------------------------
  // HISTÓRICO PARA EL BARCHART: siempre los 6 meses que terminan en
  // selectedMonth (el mes que estás navegando en Summary), aunque
  // algunos no tengan movimientos todavía (se muestran en 0).
  // --------------------------------------------------------
  const globalMetrics = useMemo(() => {
    const barLabels = lastSixMonths.map((m) => {
      const [year, month] = m.split("-").map(Number);
      const date = new Date(year ?? 0, (month ?? 1) - 1);
      return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
    });
    const barValues = lastSixMonths.map((m) => expensesByMonth[m] || 0);

    return { barLabels, barValues };
  }, [expensesByMonth, lastSixMonths]);

  const handleBudgetChange = async (id: string, value: string) => {
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue < 0) return;

    // Sin cambios respecto al valor guardado: no hay nada que enviar.
    const saved = categoriesQ.data?.find((c) => c.id === id)?.monthly_budget;
    if (saved !== undefined && Number(saved) === parsedValue) return;

    // El nuevo presupuesto se ve al instante; si la BD rechaza el cambio, vuelve el anterior.
    const revert = await updateBudgetOptimistic(queryClient, id, parsedValue);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await dashboardService.updateBudget(id, parsedValue);
    } catch (error) {
      console.error("Error actualizando presupuesto:", error);
    }

    if (result.ok) return;

    await revert();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo actualizar el presupuesto", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  };

  return {
    selectedMonth,
    handlePrevMonth,
    handleNextMonth,
    categories,
    expensesByCategory,
    totalIncome: monthIncome,
    totalExpenses,
    availableBalance,
    isLoading,
    handleBudgetChange,
    balancesByBox,
    boxList,
    barLabels: globalMetrics.barLabels,
    barValues: globalMetrics.barValues,
  };
}
