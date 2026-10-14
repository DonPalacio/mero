import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService, MedioSaldo, type ResumenFila } from "../services/dashboard.service";
import { Categoria } from "../components/Budgets";
import { toast } from "sonner";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import {
  MESES_EN_GRAFICO,
  actualizarPresupuestoOptimista,
  aClaveMes,
  categoriasQuery,
  mediosQuery,
  rendimientosMensualesQuery,
  resumenMensualQuery,
} from "@/lib/queries";

// Referencia estable para el memo mientras el resumen aún no llega.
const SIN_RESUMEN: ResumenFila[] = [];

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

  // Una sola consulta agregada en la BD (resumen_mensual) con los totales de esos meses,
  // en lugar de descargar todos sus movimientos para sumarlos aquí.
  const resumenQ = useQuery(resumenMensualQuery(selectedMonth));
  const categoriasQ = useQuery(categoriasQuery);
  const mediosQ = useQuery(mediosQuery);
  // Pesos generados por E.A. en el mes. No bloquea la pantalla: mientras llega (o si la BD aún
  // no tiene la función) cuenta como 0 y los ingresos se ven igual que antes.
  const rendimientosQ = useQuery(rendimientosMensualesQuery(selectedMonth));

  // Precarga el resumen del mes anterior y del siguiente (sin pasar del actual), para que
  // navegar de mes no espere a la red.
  useEffect(() => {
    const [anio = 0, numMes = 1] = selectedMonth.split("-").map(Number);
    [new Date(anio, numMes - 2, 1), new Date(anio, numMes, 1)]
      .map(aClaveMes)
      .filter((mes) => mes <= mesActualInicial)
      .forEach((mes) => {
        queryClient.prefetchQuery(resumenMensualQuery(mes));
        queryClient.prefetchQuery(rendimientosMensualesQuery(mes));
      });
  }, [selectedMonth, mesActualInicial, queryClient]);

  const isLoading = resumenQ.isPending || categoriasQ.isPending || mediosQ.isPending;

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
  // CÁLCULOS A PARTIR DEL RESUMEN (Summary, PieChart, Presupuestos, BarChart)
  // La BD ya sumó por mes, tipo y categoría, y solo cuenta los movimientos QUE TIENEN
  // CATEGORÍA (traspasos sin categoría quedan afuera a propósito). Aquí cada categoría
  // se traduce a su nombre; una que ya no existe en la lista se ignora.
  // --------------------------------------------------------
  const nombrePorCategoria = useMemo(
    () => new Map((categoriasQ.data ?? []).map((c) => [c.id, c.nombre])),
    [categoriasQ.data],
  );

  const { gastosPorCajita, ingresosTotales, gastosTotales, gastosPorMes } = useMemo(() => {
    const gastosPorCajita: Record<string, number> = {};
    const gastosPorMes: Record<string, number> = {};
    let ingresosTotales = 0;
    let gastosTotales = 0;

    for (const fila of resumenQ.data ?? SIN_RESUMEN) {
      const nombre = nombrePorCategoria.get(fila.categoriaId);
      if (!nombre) continue;

      if (fila.tipo === "gasto") {
        gastosPorMes[fila.mes] = (gastosPorMes[fila.mes] || 0) + fila.total;
      }
      if (fila.mes !== selectedMonth) continue;

      if (fila.tipo === "ingreso") {
        ingresosTotales += fila.total;
      } else {
        gastosTotales += fila.total;
        gastosPorCajita[nombre] = (gastosPorCajita[nombre] || 0) + fila.total;
      }
    }

    return { gastosPorCajita, ingresosTotales, gastosTotales, gastosPorMes };
  }, [resumenQ.data, nombrePorCategoria, selectedMonth]);

  // Los rendimientos E.A. no son movimientos (no tienen categoría): se suman aparte, y como
  // son ingresos del mes también suben "Queda". Los gastos no cambian.
  const rendimientosDelMes = useMemo(
    () => rendimientosQ.data?.find((f) => f.mes === selectedMonth)?.total ?? 0,
    [rendimientosQ.data, selectedMonth],
  );
  const ingresosDelMes = ingresosTotales + rendimientosDelMes;
  const saldoDisponible = ingresosDelMes - gastosTotales;

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
    const barLabels = ultimosSeisMeses.map((m) => {
      const [year, month] = m.split("-").map(Number);
      const date = new Date(year ?? 0, (month ?? 1) - 1);
      return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
    });
    const barValues = ultimosSeisMeses.map((m) => gastosPorMes[m] || 0);

    return { barLabels, barValues };
  }, [gastosPorMes, ultimosSeisMeses]);

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
    ingresosTotales: ingresosDelMes,
    rendimientosDelMes,
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
