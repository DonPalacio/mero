import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { monthsWithTransactionsQuery, monthTransactionsQuery, toMonthKey } from "@/lib/queries";

// Ventana de historial (en meses, hacia atrás desde el actual) en la que se buscan
// los meses con movimientos para el selector. No se muestra: solo acota la búsqueda.
const HISTORY_MONTHS = 24;

// Mes que se está viendo y lista de meses para el selector.
export function useTransactionMonths() {
  const currentMonth = toMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Primer día de la ventana de historial: desde ahí se buscan los meses con movimientos.
  const [currentYear = 0, currentMonthNumber = 1] = currentMonth.split("-").map(Number);
  const windowStart = new Date(currentYear, currentMonthNumber - HISTORY_MONTHS, 1);
  const fromDate = `${toMonthKey(windowStart)}-01`;
  const monthsQ = useQuery(monthsWithTransactionsQuery(fromDate));

  // Meses disponibles para filtrar la tabla: los que tengan movimientos (dentro de la
  // ventana de HISTORY_MONTHS) + el mes actual y el seleccionado siempre presentes.
  const monthOptions = useMemo(() => {
    const months = new Set<string>([...(monthsQ.data ?? []), currentMonth, selectedMonth]);

    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // más reciente primero
      .map((m) => {
        const [year = 0, month = 1] = m.split("-").map(Number);
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [monthsQ.data, currentMonth, selectedMonth]);

  return { currentMonth, selectedMonth, setSelectedMonth, monthOptions };
}

// Precarga el mes anterior y el siguiente (sin pasar del actual) para que al cambiar
// de mes la lista ya esté en caché. prefetchQuery respeta el staleTime y no lanza errores.
// `ready` es false mientras carga lo que la pantalla necesita: así no compite con ello por la
// conexión.
export function usePrefetchAdjacentMonths(
  selectedMonth: string,
  currentMonth: string,
  ready: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ready) return;

    const [yearNumber = 0, monthNumber = 1] = selectedMonth.split("-").map(Number);
    [new Date(yearNumber, monthNumber - 2, 1), new Date(yearNumber, monthNumber, 1)]
      .map(toMonthKey)
      .filter((month) => month <= currentMonth)
      .forEach((month) => queryClient.prefetchQuery(monthTransactionsQuery(month)));
  }, [selectedMonth, currentMonth, queryClient, ready]);
}
