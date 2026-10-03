import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  transactionsService,
  type MovimientoDB,
} from "@/features/transactions/services/transactions.service";
import { boxesService, type Medio as MedioDB } from "@/features/boxes/services/boxes.service";
import {
  categoriesService,
  type Categoria as CategoriaDB,
} from "@/features/categories/services/categories.service";

// Única fuente de lectura de movimientos, medios y categorías. Todas las
// pantallas (dashboard, movimientos, cajas, categorías) leen de estas claves,
// así que los datos ya cargados se reutilizan al navegar.
export const queryKeys = {
  // Raíz de las claves de movimientos. No se consulta directamente: las claves por mes
  // cuelgan de ella (["movimientos", "YYYY-MM"]), así que usarla como prefijo alcanza a todas.
  movimientos: ["movimientos"] as const,
  movimientosMes: (mes: string) => ["movimientos", mes] as const,
  // Lista de meses con movimientos para el selector. Raíz propia (no cuelga de
  // "movimientos") para no mezclarse con las cachés de movimientos por mes.
  mesesConMovimientos: (desde: string) => ["mesesConMovimientos", desde] as const,
  medios: ["medios"] as const,
  categorias: ["categorias"] as const,
};

// Movimientos de un solo mes ("YYYY-MM"), cacheados por separado.
export const movimientosMesQuery = (mes: string) =>
  queryOptions({
    queryKey: queryKeys.movimientosMes(mes),
    queryFn: () => transactionsService.obtenerMovimientos(mes),
  });

// Meses con movimientos desde `desde` ("YYYY-MM-DD"), para el selector de meses.
export const mesesConMovimientosQuery = (desde: string) =>
  queryOptions({
    queryKey: queryKeys.mesesConMovimientos(desde),
    queryFn: () => transactionsService.obtenerMesesConMovimientos(desde),
  });

// Crear/eliminar movimientos (o borrar un medio/categoría) puede hacer aparecer o
// desaparecer un mes de la lista: se invalida por prefijo, sin importar `desde`.
function mesesConMovimientosCambiaron(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: ["mesesConMovimientos"] });
}

export const mediosQuery = queryOptions({
  queryKey: queryKeys.medios,
  queryFn: boxesService.obtenerMedios,
});

export const categoriasQuery = queryOptions({
  queryKey: queryKeys.categorias,
  queryFn: categoriesService.obtenerCategorias,
});

// medios.saldo lo recalcula el trigger de la BD con cada movimiento: no se puede deducir en
// el cliente, hay que volver a leerlo (ver movimientoCreadoConfirmado y las del borrado).

// Alta optimista: la fila aparece al instante en la caché de su mes, en su posición por
// fecha. La BD ordena por fecha desc y, a igual fecha, por creación desc; como la fila nueva
// es la más reciente, va antes de las de su misma fecha. Devuelve `revertir`, que quita solo
// esa fila (por su id, sin pisar otros cambios) y vuelve a leer el mes si el INSERT falla.
export async function agregarMovimientoOptimista(qc: QueryClient, nuevo: MovimientoDB) {
  const clave = queryKeys.movimientosMes(nuevo.fecha.substring(0, 7));

  // Una lectura que ya iba en camino podría llegar sin la fila nueva y pisarla.
  await qc.cancelQueries({ queryKey: clave, exact: true });
  qc.setQueryData<MovimientoDB[]>(clave, (old) => {
    if (!old) return old;
    const i = old.findIndex((m) => m.fecha <= nuevo.fecha);
    return i === -1 ? [...old, nuevo] : [...old.slice(0, i), nuevo, ...old.slice(i)];
  });

  return async function revertir() {
    qc.setQueryData<MovimientoDB[]>(clave, (old) => old?.filter((m) => m.id !== nuevo.id));
    await qc.invalidateQueries({ queryKey: clave, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se vuelve a leer el mes (por si una lectura anterior
// llegó sin la fila nueva), la lista de meses (puede aparecer uno) y medios.saldo, que lo
// recalcula el trigger. Las tres lecturas van en paralelo.
export async function movimientoCreadoConfirmado(qc: QueryClient, nuevo: MovimientoDB) {
  await Promise.all([
    qc.invalidateQueries({
      queryKey: queryKeys.movimientosMes(nuevo.fecha.substring(0, 7)),
      exact: true,
    }),
    mesesConMovimientosCambiaron(qc),
    qc.invalidateQueries({ queryKey: queryKeys.medios }),
  ]);
}

// Borrado optimista: quita el movimiento al instante de las cachés que lo contienen y
// devuelve `revertir`, para deshacerlo si la BD rechaza el borrado. Revertir restaura la
// copia y vuelve a leer esos meses, por si algo cambió mientras tanto.
export async function quitarMovimientoOptimista(qc: QueryClient, id: string) {
  const afectados = qc
    .getQueriesData<MovimientoDB[]>({ queryKey: queryKeys.movimientos })
    .filter(([, data]) => data?.some((m) => m.id === id));

  await Promise.all(afectados.map(([queryKey]) => qc.cancelQueries({ queryKey, exact: true })));
  afectados.forEach(([queryKey]) =>
    qc.setQueryData<MovimientoDB[]>(queryKey, (old) => old?.filter((m) => m.id !== id)),
  );

  return async function revertir() {
    afectados.forEach(([queryKey, previo]) => qc.setQueryData<MovimientoDB[]>(queryKey, previo));
    await Promise.all(
      afectados.map(([queryKey]) => qc.invalidateQueries({ queryKey, exact: true })),
    );
  };
}

// Una vez la BD confirma el borrado: medios.saldo lo recalcula el trigger y puede haber
// desaparecido un mes de la lista. Se piden en paralelo.
export async function movimientoEliminadoConfirmado(qc: QueryClient) {
  await Promise.all([
    mesesConMovimientosCambiaron(qc),
    qc.invalidateQueries({ queryKey: queryKeys.medios }),
  ]);
}

// Alta optimista de una categoría: aparece al instante al final de la lista (la BD las ordena
// por creación). La BD completa los demás campos y categoriaCreadaConfirmada relee la lista.
// Devuelve `revertir`, que quita solo esa fila (por su id) y vuelve a leer la lista.
export async function agregarCategoriaOptimista(qc: QueryClient, nueva: CategoriaDB) {
  await qc.cancelQueries({ queryKey: queryKeys.categorias, exact: true });
  qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) => (old ? [...old, nueva] : old));

  return async function revertir() {
    qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) =>
      old?.filter((c) => c.id !== nueva.id),
    );
    await qc.invalidateQueries({ queryKey: queryKeys.categorias, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se relee la lista para reemplazar los valores
// provisionales por los reales.
export function categoriaCreadaConfirmada(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.categorias, exact: true });
}

// Renombrado optimista de una categoría: cambia el nombre al instante en la categoría y
// en los movimientos ya cacheados (el nombre viene del join; los nombres son únicos, así
// que todo movimiento con el nombre anterior es de esta categoría). Devuelve `revertir`,
// que restaura las copias y vuelve a leer desde la BD si el cambio es rechazado.
export async function renombrarCategoriaOptimista(
  qc: QueryClient,
  id: string,
  nuevoNombre: string,
) {
  const categoriasPrevias = qc.getQueryData<CategoriaDB[]>(queryKeys.categorias);
  const nombreAnterior = categoriasPrevias?.find((c) => c.id === id)?.nombre;
  const movimientosPrevios = qc.getQueriesData<MovimientoDB[]>({
    queryKey: queryKeys.movimientos,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.categorias, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.movimientos }),
  ]);

  qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) =>
    old?.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c)),
  );
  if (nombreAnterior) {
    movimientosPrevios.forEach(([queryKey]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, (old) =>
        old?.map((m) => (m.cajita === nombreAnterior ? { ...m, cajita: nuevoNombre } : m)),
      ),
    );
  }

  return async function revertir() {
    qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, categoriasPrevias);
    movimientosPrevios.forEach(([queryKey, previo]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, previo),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.categorias, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.movimientos }),
    ]);
  };
}

// Una vez la BD confirma el renombrado (de categoría o de medio), las cachés ya tienen el
// nombre nuevo: no hace falta volver a pedir los movimientos ahora. Solo se marcan como por
// revisar (sin refetch) por seguridad; se refrescarán la próxima vez que se necesiten.
export function catalogoRenombradoConfirmado(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.movimientos, refetchType: "none" });
}

// Alta optimista de un medio: aparece al instante al final de la lista (la BD los ordena por
// creación). La BD completa los demás campos y medioCreadoConfirmado relee la lista.
// Devuelve `revertir`, que quita solo esa fila (por su id) y vuelve a leer la lista.
export async function agregarMedioOptimista(qc: QueryClient, nuevo: MedioDB) {
  await qc.cancelQueries({ queryKey: queryKeys.medios, exact: true });
  qc.setQueryData<MedioDB[]>(queryKeys.medios, (old) => (old ? [...old, nuevo] : old));

  return async function revertir() {
    qc.setQueryData<MedioDB[]>(queryKeys.medios, (old) => old?.filter((m) => m.id !== nuevo.id));
    await qc.invalidateQueries({ queryKey: queryKeys.medios, exact: true });
  };
}

// Una vez la BD confirma el INSERT: se relee la lista para reemplazar los valores
// provisionales por los reales.
export function medioCreadoConfirmado(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.medios, exact: true });
}

// Igual que el de categorías, pero para medios: el nombre del medio viene del join en
// `movimiento.medio` (también único por usuario).
export async function renombrarMedioOptimista(qc: QueryClient, id: string, nuevoNombre: string) {
  const mediosPrevios = qc.getQueryData<MedioDB[]>(queryKeys.medios);
  const nombreAnterior = mediosPrevios?.find((m) => m.id === id)?.nombre;
  const movimientosPrevios = qc.getQueriesData<MovimientoDB[]>({
    queryKey: queryKeys.movimientos,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.medios, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.movimientos }),
  ]);

  qc.setQueryData<MedioDB[]>(queryKeys.medios, (old) =>
    old?.map((m) => (m.id === id ? { ...m, nombre: nuevoNombre } : m)),
  );
  if (nombreAnterior) {
    movimientosPrevios.forEach(([queryKey]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, (old) =>
        old?.map((m) => (m.medio === nombreAnterior ? { ...m, medio: nuevoNombre } : m)),
      ),
    );
  }

  return async function revertir() {
    qc.setQueryData<MedioDB[]>(queryKeys.medios, mediosPrevios);
    movimientosPrevios.forEach(([queryKey, previo]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, previo),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.medios, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.movimientos }),
    ]);
  };
}

// Borrado optimista de un medio: la BD borra también sus movimientos (on delete cascade),
// así que se quitan de las cachés de meses los que tengan el nombre de ese medio. Los saldos
// de los demás medios no cambian (el trigger solo toca el saldo del medio de cada movimiento).
export async function quitarMedioOptimista(qc: QueryClient, id: string) {
  const mediosPrevios = qc.getQueryData<MedioDB[]>(queryKeys.medios);
  const nombre = mediosPrevios?.find((m) => m.id === id)?.nombre;
  const movimientosPrevios = qc.getQueriesData<MovimientoDB[]>({
    queryKey: queryKeys.movimientos,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.medios, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.movimientos }),
  ]);

  qc.setQueryData<MedioDB[]>(queryKeys.medios, (old) => old?.filter((m) => m.id !== id));
  if (nombre) {
    movimientosPrevios.forEach(([queryKey]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, (old) => old?.filter((m) => m.medio !== nombre)),
    );
  }

  return async function revertir() {
    qc.setQueryData<MedioDB[]>(queryKeys.medios, mediosPrevios);
    movimientosPrevios.forEach(([queryKey, previo]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, previo),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.medios, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.movimientos }),
    ]);
  };
}

// Una vez la BD confirma el borrado del medio: puede haber desaparecido algún mes de la
// lista, y los movimientos se marcan como por revisar sin volver a pedirlos ahora.
export async function medioEliminadoConfirmado(qc: QueryClient) {
  await Promise.all([
    mesesConMovimientosCambiaron(qc),
    qc.invalidateQueries({ queryKey: queryKeys.movimientos, refetchType: "none" }),
  ]);
}

// Borrado optimista de una categoría: la BD NO borra sus movimientos (on delete set null),
// quedan sin categoría; por eso en las cachés de meses solo se vacía `cajita` (los nombres
// son únicos, así que todo movimiento con ese nombre era de esta categoría). Devuelve
// `revertir`, que restaura las copias y vuelve a leer desde la BD si el borrado es rechazado.
export async function quitarCategoriaOptimista(qc: QueryClient, id: string) {
  const categoriasPrevias = qc.getQueryData<CategoriaDB[]>(queryKeys.categorias);
  const nombre = categoriasPrevias?.find((c) => c.id === id)?.nombre;
  const movimientosPrevios = qc.getQueriesData<MovimientoDB[]>({
    queryKey: queryKeys.movimientos,
  });

  await Promise.all([
    qc.cancelQueries({ queryKey: queryKeys.categorias, exact: true }),
    qc.cancelQueries({ queryKey: queryKeys.movimientos }),
  ]);

  qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) => old?.filter((c) => c.id !== id));
  if (nombre) {
    movimientosPrevios.forEach(([queryKey]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, (old) =>
        old?.map((m) => (m.cajita === nombre ? { ...m, cajita: "" } : m)),
      ),
    );
  }

  return async function revertir() {
    qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, categoriasPrevias);
    movimientosPrevios.forEach(([queryKey, previo]) =>
      qc.setQueryData<MovimientoDB[]>(queryKey, previo),
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.categorias, exact: true }),
      qc.invalidateQueries({ queryKey: queryKeys.movimientos }),
    ]);
  };
}

// Presupuesto optimista: el nuevo valor se ve al instante (barras y totales del Dashboard
// salen de esta misma caché). Devuelve `revertir`, que restaura solo el presupuesto de esa
// categoría (sin pisar otros cambios) y vuelve a leer la lista si la BD rechaza el cambio.
export async function actualizarPresupuestoOptimista(
  qc: QueryClient,
  id: string,
  presupuesto: number,
) {
  const anterior = qc
    .getQueryData<CategoriaDB[]>(queryKeys.categorias)
    ?.find((c) => c.id === id)?.presupuesto_mensual;

  await qc.cancelQueries({ queryKey: queryKeys.categorias, exact: true });
  qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) =>
    old?.map((c) => (c.id === id ? { ...c, presupuesto_mensual: presupuesto } : c)),
  );

  return async function revertir() {
    if (anterior !== undefined) {
      qc.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) =>
        old?.map((c) => (c.id === id ? { ...c, presupuesto_mensual: anterior } : c)),
      );
    }
    await qc.invalidateQueries({ queryKey: queryKeys.categorias, exact: true });
  };
}

// Una vez la BD confirma el borrado, las cachés ya reflejan los movimientos sin categoría:
// no hace falta volver a pedirlos ahora. Solo se marcan como por revisar (sin refetch).
// La lista de meses no cambia: ningún movimiento desaparece.
export function categoriaEliminadaConfirmada(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: queryKeys.movimientos, refetchType: "none" });
}
