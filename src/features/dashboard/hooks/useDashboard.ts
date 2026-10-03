import { useState, useMemo, useEffect } from "react";
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { dashboardService, MedioSaldo } from "../services/dashboard.service";
import type { MovimientoDB } from "@/features/transactions/services/transactions.service";
import { Categoria } from "../components/Budgets";
import { toast } from "sonner";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import {
  MESES_EN_GRAFICO,
  actualizarPresupuestoOptimista,
  aClaveMes,
  categoriasQuery,
  mediosQuery,
  movimientosMesQuery,
} from "@/lib/queries";

// Une los movimientos de los meses pedidos. Va fuera del hook para tener una referencia
// estable (así useQueries no recalcula el resultado en cada render). El último mes es
// el seleccionado: solo él decide si el dashboard está cargando.
const combinarMovimientos = (results: UseQueryResult<MovimientoDB[], Error>[]) => ({
  movimientos: results.flatMap((r) => r.data ?? []),
  mesSeleccionadoPendiente: results[results.length - 1]?.isPending ?? true,
});

export function useDashboard() {
  const queryClient = useQueryClient();

  // Estado para el mes actual
  const hoy = new Date();
  const mesActualInicial = aClaveMes(hoy);
  const [selectedMonth, setSelectedMonth] = useState(mesActualInicial);

  // Los MESES_EN_GRAFICO meses que terminan en selectedMonth (el más antiguo primero),
  // aunque algunos no tengan movimientos todavía.
  const ultimosSeisMeses = useMemo(() => {
    const [selYear = 0, selMonthNum = 1] = selectedMonth.split("-").map(Number);

    const meses: string[] = [];
    for (let i = MESES_EN_GRAFICO - 1; i >= 0; i--) {
      meses.push(aClaveMes(new Date(selYear, selMonthNum - 1 - i, 1)));
    }
    return meses;
  }, [selectedMonth]);

  // Solo se piden esos meses (no todo el historial); cada uno se cachea por separado.
  const movimientosQ = useQueries({
    queries: ultimosSeisMeses.map((mes) => movimientosMesQuery(mes)),
    combine: combinarMovimientos,
  });
  const categoriasQ = useQuery(categoriasQuery);
  const mediosQ = useQuery(mediosQuery);

  // Precarga el mes siguiente (sin pasar del actual) y el que entra a la ventana al
  // retroceder, para que navegar de mes no espere a la red.
  useEffect(() => {
    const [anio = 0, numMes = 1] = selectedMonth.split("-").map(Number);
    [new Date(anio, numMes - 1 - MESES_EN_GRAFICO, 1), new Date(anio, numMes, 1)]
      .map(aClaveMes)
      .filter((mes) => mes <= mesActualInicial)
      .forEach((mes) => queryClient.prefetchQuery(movimientosMesQuery(mes)));
  }, [selectedMonth, mesActualInicial, queryClient]);

  const movimientosTotales = movimientosQ.movimientos;
  const isLoading =
    movimientosQ.mesSeleccionadoPendiente || categoriasQ.isPending || mediosQ.isPending;

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
    () => (mediosQ.data ?? []).map((m) => ({ id: m.id, name: m.nombre, saldo: Number(m.saldo) })),
    [mediosQ.data],
  );

  const handlePrevMonth = () => {
    const [year = hoy.getFullYear(), month = hoy.getMonth() + 1] = selectedMonth
      .split("-")
      .map(Number);
    const date = new Date(year, month - 2);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year = hoy.getFullYear(), month = hoy.getMonth() + 1] = selectedMonth
      .split("-")
      .map(Number);
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
    const gastosPorMesCalc: Record<string, number> = {};
    movimientosTotales.forEach((mov) => {
      if (mov.tipo === "gasto" && mov.cajita) {
        const mesMov = mov.fecha.substring(0, 7);
        gastosPorMesCalc[mesMov] = (gastosPorMesCalc[mesMov] || 0) + mov.monto;
      }
    });

    const barLabels = ultimosSeisMeses.map((m) => {
      const [year, month] = m.split("-").map(Number);
      const date = new Date(year ?? 0, (month ?? 1) - 1);
      return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
    });
    const barValues = ultimosSeisMeses.map((m) => gastosPorMesCalc[m] || 0);

    return { barLabels, barValues };
  }, [movimientosTotales, ultimosSeisMeses]);

  const handleBudgetChange = async (id: string, value: string) => {
    const valor = parseFloat(value);
    if (isNaN(valor) || valor < 0) return;

    // Sin cambios respecto al valor guardado: no hay nada que enviar.
    const guardado = categoriasQ.data?.find((c) => c.id === id)?.presupuesto_mensual;
    if (guardado !== undefined && Number(guardado) === valor) return;

    // El nuevo presupuesto se ve al instante; si la BD rechaza el cambio, vuelve el anterior.
    const revertir = await actualizarPresupuestoOptimista(queryClient, id, valor);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await dashboardService.actualizarPresupuesto(id, valor);
    } catch (error) {
      console.error("Error actualizando presupuesto:", error);
    }

    if (resultado.ok) return;

    await revertir();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo actualizar el presupuesto", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
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
