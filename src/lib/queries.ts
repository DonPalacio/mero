import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  transactionsService,
  type MovimientoDB,
} from "@/features/transactions/services/transactions.service";
import { boxesService } from "@/features/boxes/services/boxes.service";
import { categoriesService } from "@/features/categories/services/categories.service";

// Única fuente de lectura de movimientos, medios y categorías. Todas las
// pantallas (dashboard, movimientos, cajas, categorías) leen de estas claves,
// así que los datos ya cargados se reutilizan al navegar.
export const queryKeys = {
  movimientos: ["movimientos"] as const,
  medios: ["medios"] as const,
  categorias: ["categorias"] as const,
};

export const movimientosQuery = queryOptions({
  queryKey: queryKeys.movimientos,
  queryFn: transactionsService.obtenerMovimientos,
});

export const mediosQuery = queryOptions({
  queryKey: queryKeys.medios,
  queryFn: boxesService.obtenerMedios,
});

export const categoriasQuery = queryOptions({
  queryKey: queryKeys.categorias,
  queryFn: categoriesService.obtenerCategorias,
});

// medios.saldo lo recalcula el trigger de la BD con cada movimiento: no se puede
// deducir en el cliente, hay que volver a leerlo.
export async function movimientoCreado(qc: QueryClient, nuevo: MovimientoDB) {
  await qc.cancelQueries({ queryKey: queryKeys.movimientos });
  if (qc.getQueryData(queryKeys.movimientos)) {
    qc.setQueryData<MovimientoDB[]>(queryKeys.movimientos, (old) => (old ? [nuevo, ...old] : old));
  } else {
    await qc.invalidateQueries({ queryKey: queryKeys.movimientos });
  }
  await qc.invalidateQueries({ queryKey: queryKeys.medios });
}

export async function movimientoEliminado(qc: QueryClient, id: string) {
  await qc.cancelQueries({ queryKey: queryKeys.movimientos });
  if (qc.getQueryData(queryKeys.movimientos)) {
    qc.setQueryData<MovimientoDB[]>(queryKeys.movimientos, (old) =>
      old ? old.filter((m) => m.id !== id) : old,
    );
  } else {
    await qc.invalidateQueries({ queryKey: queryKeys.movimientos });
  }
  await qc.invalidateQueries({ queryKey: queryKeys.medios });
}

// Renombrar o eliminar un medio/categoría cambia los movimientos que ya están en
// caché: el nombre viene del join, medios borra sus movimientos en cascada
// (on delete cascade) y categorias los deja sin categoría (on delete set null).
export async function catalogoModificado(qc: QueryClient) {
  await qc.invalidateQueries({ queryKey: queryKeys.movimientos });
}
