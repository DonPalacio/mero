import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  transactionsService,
  type TransactionRow,
} from "@/features/transactions/services/transactions.service";
import { boxesService, type Box as BoxRow } from "@/features/boxes/services/boxes.service";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import {
  categoriesService,
  type Category as CategoryRow,
} from "@/features/categories/services/categories.service";

// Única fuente de lectura de movimientos, medios y categorías. Todas las
// pantallas (dashboard, movimientos, cajas, categorías) leen de estas claves,
// así que los datos ya cargados se reutilizan al navegar.
export const queryKeys = {
  // Raíz de las claves de movimientos. No se consulta directamente: las claves por mes
  // cuelgan de ella (["movimientos", "YYYY-MM"]), así que usarla como prefijo alcanza a todas.
  transactions: ["transactions"] as const,
  monthTransactions: (month: string) => ["transactions", month] as const,
  // Lista de meses con movimientos para el selector. Raíz propia (no cuelga de
  // "movimientos") para no mezclarse con las cachés de movimientos por mes.
  monthsWithTransactions: (fromDate: string) => ["monthsWithTransactions", fromDate] as const,
  // Totales del dashboard (monthly_summary). Una clave por mes en que termina la ventana de
  // CHART_MONTHS; la raíz sirve de prefijo para invalidarlas todas.
  monthlySummary: ["monthlySummary"] as const,
  monthlySummaryUntil: (month: string) => ["monthlySummary", month] as const,
  // Pesos generados por E.A. en un mes ("YYYY-MM"); la raíz sirve de prefijo para invalidarlos todos.
  monthlyYields: ["monthlyYields"] as const,
  monthlyYieldsForMonth: (month: string) => ["monthlyYields", month] as const,
  boxes: ["boxes"] as const,
  categories: ["categories"] as const,
};

// Movimientos de un solo mes ("YYYY-MM"), cacheados por separado.
export const monthTransactionsQuery = (month: string) =>
  queryOptions({
    queryKey: queryKeys.monthTransactions(month),
    queryFn: () => transactionsService.getTransactions(month),
  });

// Meses con movimientos desde `desde` ("YYYY-MM-DD"), para el selector de meses.
export const monthsWithTransactionsQuery = (fromDate: string) =>
  queryOptions({
    queryKey: queryKeys.monthsWithTransactions(fromDate),
    queryFn: () => transactionsService.getMonthsWithTransactions(fromDate),
  });

// Crear/eliminar movimientos (o borrar un medio/categoría) puede hacer aparecer o
// desaparecer un mes de la lista: se invalida por prefijo, sin importar `desde`.
function monthsWithTransactionsChanged(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: ["monthsWithTransactions"] });
}

// Totales (por mes, tipo y categoría) de los CHART_MONTHS meses que terminan en `month`
// ("YYYY-MM"), calculados en la BD. Alimentan el dashboard.
export const monthlySummaryQuery = (month: string) =>
  queryOptions({
    queryKey: queryKeys.monthlySummaryUntil(month),
    queryFn: () => {
      const [yearNumber = 0, monthNumber = 1] = month.split("-").map(Number);
      const fromDate = `${toMonthKey(new Date(yearNumber, monthNumber - CHART_MONTHS, 1))}-01`;
      const untilDate = `${toMonthKey(new Date(yearNumber, monthNumber, 1))}-01`;
      return dashboardService.getMonthlySummary(fromDate, untilDate);
    },
  });

// Pesos acreditados por E.A. en un solo mes ("YYYY-MM"), calculados en la BD. El dashboard los
// suma a los ingresos del mes; no son movimientos, por eso no salen de resumenMensualQuery.
export const monthlyYieldsQuery = (month: string) =>
  queryOptions({
    queryKey: queryKeys.monthlyYieldsForMonth(month),
    queryFn: () => {
      const [yearNumber = 0, monthNumber = 1] = month.split("-").map(Number);
      const fromDate = `${month}-01`;
      const untilDate = `${toMonthKey(new Date(yearNumber, monthNumber, 1))}-01`;
      return dashboardService.getMonthlyYields(fromDate, untilDate);
    },
  });

// Cambiar una tasa, reiniciar rendimientos o borrar una caja cambia lo acreditado por E.A.
function monthlyYieldsChanged(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.monthlyYields });
}

// Crear o borrar movimientos (o borrar un medio/categoría) cambia los totales del dashboard.
// Se marcan por revisar todos los resúmenes: el dashboard los vuelve a pedir al abrirse.
function monthlySummaryChanged(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.monthlySummary });
}

export const boxesQuery = queryOptions({
  queryKey: queryKeys.boxes,
  queryFn: boxesService.getBoxes,
});

export const categoriesQuery = queryOptions({
  queryKey: queryKeys.categories,
  queryFn: categoriesService.getCategories,
});

// Meses que muestra el BarChart del dashboard: los que terminan en el mes seleccionado.
export const CHART_MONTHS = 6;

export const toMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Pide por adelantado lo que va a leer una pantalla, para que al abrirla los datos ya estén
// en caché (el Sidebar lo llama al pasar el cursor, enfocar o tocar un enlace). Usa las mismas
// consultas que las pantallas: prefetchQuery respeta el staleTime, no repite lo que ya está
// fresco ni lanza errores (si falla, la pantalla simplemente lo pedirá al abrirse).
export function prefetchScreen(qc: QueryClient, routePath: string) {
  const today = new Date();
  const currentMonth = toMonthKey(today);

  switch (routePath) {
    case "/dashboard":
      // El resumen de los CHART_MONTHS meses que terminan en el actual (una sola consulta).
      void qc.prefetchQuery(monthlySummaryQuery(currentMonth));
      void qc.prefetchQuery(monthlyYieldsQuery(currentMonth));
      void qc.prefetchQuery(categoriesQuery);
      void qc.prefetchQuery(boxesQuery);
      break;
    case "/transactions":
      void qc.prefetchQuery(monthTransactionsQuery(currentMonth));
      void qc.prefetchQuery(categoriesQuery);
      void qc.prefetchQuery(boxesQuery);
      break;
    case "/boxes":
      void qc.prefetchQuery(boxesQuery);
      break;
    case "/categories":
      void qc.prefetchQuery(categoriesQuery);
      break;
  }
}

// boxes.balance lo recalcula el trigger de la BD con cada movimiento: no se puede deducir en
// el cliente, hay que volver a leerlo (ver movimientoCreadoConfirmado y las del borrado).

// Alta optimista: la fila aparece al instante en la caché de su mes, en su posición por
// fecha. La BD ordena por fecha desc y, a igual fecha, por creación desc; como la fila nueva
// es la más reciente, va antes de las de su misma fecha. Devuelve `revertir`, que quita solo
// esa fila (por su id, sin pisar otros cambios) y vuelve a leer el mes si el INSERT falla.
export async function addTransactionOptimistic(qc: QueryClient, newValue: TransactionRow) {
  const cacheKey = queryKeys.monthTransactions(newValue.date.substring(0, 7));

  // Una lectura que ya iba en camino podría llegar sin la fila nueva y pisarla.
  await qc.cancelQueries({ queryKey: cacheKey, exact: true });
  qc.setQueryData<TransactionRow[]>(cacheKey, (old) => {
    if (!old) return old;
    const i = old.findIndex((m) => m.date <= newValue.date);
    return i === -1 ? [...old, newValue] : [...old.slice(0, i), newValue, ...old.slice(i)];
  });

  return async function revert() {
    qc.setQueryData<TransactionRow[]>(cacheKey, (old) => old?.filter((m) => m.id !== newValue.id));
    await qc.invalidateQueries({ queryKey: cacheKey, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se vuelve a leer el mes (por si una lectura anterior
// llegó sin la fila nueva), la lista de meses (puede aparecer uno) y boxes.balance, que lo
// recalcula el trigger. Las tres lecturas van en paralelo.
export async function transactionCreatedConfirmed(qc: QueryClient, newValue: TransactionRow) {
  await Promise.all([
    qc.invalidateQueries({
      queryKey: queryKeys.monthTransactions(newValue.date.substring(0, 7)),
      exact: true,
    }),
    monthsWithTransactionsChanged(qc),
    monthlySummaryChanged(qc),
    qc.invalidateQueries({ queryKey: queryKeys.boxes }),
  ]);
}

// Borrado optimista: quita el movimiento al instante de las cachés que lo contienen y
// devuelve `revertir`, para deshacerlo si la BD rechaza el borrado. Revertir restaura la
// copia y vuelve a leer esos meses, por si algo cambió mientras tanto.
export async function removeTransactionOptimistic(qc: QueryClient, id: string) {
  const affected = qc
    .getQueriesData<TransactionRow[]>({ queryKey: queryKeys.transactions })
    .filter(([, data]) => data?.some((m) => m.id === id));

  await Promise.all(affected.map(([queryKey]) => qc.cancelQueries({ queryKey, exact: true })));
  affected.forEach(([queryKey]) =>
    qc.setQueryData<TransactionRow[]>(queryKey, (old) => old?.filter((m) => m.id !== id)),
  );

  return async function revert() {
    affected.forEach(([queryKey, previousValue]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, previousValue),
    );
    await Promise.all(
      affected.map(([queryKey]) => qc.invalidateQueries({ queryKey, exact: true })),
    );
  };
}

// Una vez la BD confirma el borrado: boxes.balance lo recalcula el trigger y puede haber
// desaparecido un mes de la lista. Se piden en paralelo.
export async function transactionDeletedConfirmed(qc: QueryClient) {
  await Promise.all([
    monthsWithTransactionsChanged(qc),
    monthlySummaryChanged(qc),
    qc.invalidateQueries({ queryKey: queryKeys.boxes }),
  ]);
}

// Alta optimista de una categoría: aparece al instante al final de la lista (la BD las ordena
// por creación). La BD completa los demás campos y categoriaCreadaConfirmada relee la lista.
// Devuelve `revertir`, que quita solo esa fila (por su id) y vuelve a leer la lista.
export async function addCategoryOptimistic(qc: QueryClient, newValue: CategoryRow) {
  await qc.cancelQueries({ queryKey: queryKeys.categories, exact: true });
  qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) => (old ? [...old, newValue] : old));

  return async function revert() {
    qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) =>
      old?.filter((c) => c.id !== newValue.id),
    );
    await qc.invalidateQueries({ queryKey: queryKeys.categories, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se relee la lista para reemplazar los valores
// provisionales por los reales.
export function categoryCreatedConfirmed(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.categories, exact: true });
}

// Renombrado optimista de una categoría: cambia el nombre al instante en la categoría y
// en los movimientos ya cacheados (el nombre viene del join; los nombres son únicos, así
// que todo movimiento con el nombre anterior es de esta categoría). Devuelve `revertir`,
// que restaura las copias y vuelve a leer desde la BD si el cambio es rechazado.
export async function renameCategoryOptimistic(qc: QueryClient, id: string, newName: string) {
  const previousCategories = qc.getQueryData<CategoryRow[]>(queryKeys.categories);
  const previousName = previousCategories?.find((c) => c.id === id)?.name;
  const previousTransactions = qc.getQueriesData<TransactionRow[]>({
    queryKey: queryKeys.transactions,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.categories, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.transactions }),
  ]);

  qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) =>
    old?.map((c) => (c.id === id ? { ...c, name: newName } : c)),
  );
  if (previousName) {
    previousTransactions.forEach(([queryKey]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, (old) =>
        old?.map((m) => (m.category === previousName ? { ...m, category: newName } : m)),
      ),
    );
  }

  return async function revert() {
    qc.setQueryData<CategoryRow[]>(queryKeys.categories, previousCategories);
    previousTransactions.forEach(([queryKey, previousValue]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, previousValue),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.categories, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.transactions }),
    ]);
  };
}

// Una vez la BD confirma el renombrado (de categoría o de medio), las cachés ya tienen el
// nombre nuevo: no hace falta volver a pedir los movimientos ahora. Solo se marcan como por
// revisar (sin refetch) por seguridad; se refrescarán la próxima vez que se necesiten.
export function catalogRenamedConfirmed(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: "none" });
}

// Alta optimista de un medio: aparece al instante al final de la lista (la BD los ordena por
// creación). La BD completa los demás campos y medioCreadoConfirmado relee la lista.
// Devuelve `revertir`, que quita solo esa fila (por su id) y vuelve a leer la lista.
export async function addBoxOptimistic(qc: QueryClient, newValue: BoxRow) {
  await qc.cancelQueries({ queryKey: queryKeys.boxes, exact: true });
  qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) => (old ? [...old, newValue] : old));

  return async function revert() {
    qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) => old?.filter((m) => m.id !== newValue.id));
    await qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se relee la lista para reemplazar los valores
// provisionales por los reales.
export function boxCreatedConfirmed(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true });
}

// Igual que el de categorías, pero para medios: el nombre del medio viene del join en
// `movimiento.medio` (también único por usuario).
export async function renameBoxOptimistic(qc: QueryClient, id: string, newName: string) {
  const previousBoxes = qc.getQueryData<BoxRow[]>(queryKeys.boxes);
  const previousName = previousBoxes?.find((m) => m.id === id)?.name;
  const previousTransactions = qc.getQueriesData<TransactionRow[]>({
    queryKey: queryKeys.transactions,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.boxes, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.transactions }),
  ]);

  qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) =>
    old?.map((m) => (m.id === id ? { ...m, name: newName } : m)),
  );
  if (previousName) {
    previousTransactions.forEach(([queryKey]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, (old) =>
        old?.map((m) => (m.box === previousName ? { ...m, box: newName } : m)),
      ),
    );
  }

  return async function revert() {
    qc.setQueryData<BoxRow[]>(queryKeys.boxes, previousBoxes);
    previousTransactions.forEach(([queryKey, previousValue]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, previousValue),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.transactions }),
    ]);
  };
}

// Cambio optimista de la tasa E.A. de un medio. Devuelve `revertir`, que restaura solo la tasa
// de ese medio (sin pisar otros cambios) y vuelve a leer la lista si la BD rechaza el cambio.
export async function updateBoxEaRateOptimistic(qc: QueryClient, id: string, rate: number | null) {
  const previous = qc.getQueryData<BoxRow[]>(queryKeys.boxes)?.find((m) => m.id === id);

  await qc.cancelQueries({ queryKey: queryKeys.boxes, exact: true });
  qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) =>
    old?.map((m) => (m.id === id ? { ...m, ea_rate: rate } : m)),
  );

  return async function revert() {
    if (previous) {
      qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) =>
        old?.map((m) => (m.id === id ? { ...m, ea_rate: previous.ea_rate } : m)),
      );
    }
    await qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true });
  };
}

// Una vez la BD confirma un cambio de tasa o el reinicio de rendimientos, el saldo del medio
// pudo cambiar (se relee la lista) y también lo acreditado por E.A. en los ingresos del mes.
export function boxYieldConfirmed(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true }),
    monthlyYieldsChanged(qc),
  ]);
}

// Borrado optimista de un medio: la BD borra también sus movimientos (on delete cascade),
// así que se quitan de las cachés de meses los que tengan el nombre de ese medio. Los saldos
// de los demás medios no cambian (el trigger solo toca el saldo del medio de cada movimiento).
export async function removeBoxOptimistic(qc: QueryClient, id: string) {
  const previousBoxes = qc.getQueryData<BoxRow[]>(queryKeys.boxes);
  const name = previousBoxes?.find((m) => m.id === id)?.name;
  const previousTransactions = qc.getQueriesData<TransactionRow[]>({
    queryKey: queryKeys.transactions,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.boxes, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.transactions }),
  ]);

  qc.setQueryData<BoxRow[]>(queryKeys.boxes, (old) => old?.filter((m) => m.id !== id));
  if (name) {
    previousTransactions.forEach(([queryKey]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, (old) => old?.filter((m) => m.box !== name)),
    );
  }

  return async function revert() {
    qc.setQueryData<BoxRow[]>(queryKeys.boxes, previousBoxes);
    previousTransactions.forEach(([queryKey, previousValue]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, previousValue),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.boxes, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.transactions }),
    ]);
  };
}

// Una vez la BD confirma el borrado del medio: puede haber desaparecido algún mes de la
// lista, y los movimientos se marcan como por revisar sin volver a pedirlos ahora.
export async function boxDeletedConfirmed(qc: QueryClient) {
  await Promise.all([
    monthsWithTransactionsChanged(qc),
    monthlySummaryChanged(qc),
    // Sus rendimientos también se borran en cascada.
    monthlyYieldsChanged(qc),
    qc.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: "none" }),
  ]);
}

// Borrado optimista de una categoría: la BD NO borra sus movimientos (on delete set null),
// quedan sin categoría; por eso en las cachés de meses solo se vacía `cajita` (los nombres
// son únicos, así que todo movimiento con ese nombre era de esta categoría). Devuelve
// `revertir`, que restaura las copias y vuelve a leer desde la BD si el borrado es rechazado.
export async function removeCategoryOptimistic(qc: QueryClient, id: string) {
  const previousCategories = qc.getQueryData<CategoryRow[]>(queryKeys.categories);
  const name = previousCategories?.find((c) => c.id === id)?.name;
  const previousTransactions = qc.getQueriesData<TransactionRow[]>({
    queryKey: queryKeys.transactions,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.categories, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.transactions }),
  ]);

  qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) => old?.filter((c) => c.id !== id));
  if (name) {
    previousTransactions.forEach(([queryKey]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, (old) =>
        old?.map((m) => (m.category === name ? { ...m, category: "" } : m)),
      ),
    );
  }

  return async function revert() {
    qc.setQueryData<CategoryRow[]>(queryKeys.categories, previousCategories);
    previousTransactions.forEach(([queryKey, previousValue]) =>
      qc.setQueryData<TransactionRow[]>(queryKey, previousValue),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.categories, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.transactions }),
    ]);
  };
}

// Presupuesto optimista: el nuevo valor se ve al instante (barras y totales del Dashboard
// salen de esta misma caché). Devuelve `revertir`, que restaura solo el presupuesto de esa
// categoría (sin pisar otros cambios) y vuelve a leer la lista si la BD rechaza el cambio.
export async function updateBudgetOptimistic(qc: QueryClient, id: string, budget: number) {
  const previous = qc
    .getQueryData<CategoryRow[]>(queryKeys.categories)
    ?.find((c) => c.id === id)?.monthly_budget;

  await qc.cancelQueries({ queryKey: queryKeys.categories, exact: true });
  qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) =>
    old?.map((c) => (c.id === id ? { ...c, monthly_budget: budget } : c)),
  );

  return async function revert() {
    if (previous !== undefined) {
      qc.setQueryData<CategoryRow[]>(queryKeys.categories, (old) =>
        old?.map((c) => (c.id === id ? { ...c, monthly_budget: previous } : c)),
      );
    }
    await qc.invalidateQueries({ queryKey: queryKeys.categories, exact: true });
  };
}

// Una vez la BD confirma el borrado, las cachés de movimientos ya reflejan que quedaron sin
// categoría: no hace falta volver a pedirlas ahora, solo se marcan como por revisar (sin
// refetch). Los totales del dashboard sí cambian (esos movimientos dejan de contar), así que
// sus resúmenes también se marcan. La lista de meses no cambia: ningún movimiento desaparece.
export function categoryDeletedConfirmed(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: "none" }),
    monthlySummaryChanged(qc),
  ]);
}
