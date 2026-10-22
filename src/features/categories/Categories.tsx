import React from "react";
import {
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconPlus,
  IconArrowDownRight,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import TypeSelector from "@/components/TypeSelector";
import { useCategories } from "./hooks/useCategories";

export default function Categories() {
  const {
    categories,
    isLoading,
    newCategoryValue,
    setNewCategoryValue,
    newCategoryType,
    setNewCategoryType,
    editingCategory,
    setEditingCategory,
    renameValue,
    setRenameValue,
    confirmDeleteCategory,
    setConfirmDeleteCategory,
    handleAddCategory,
    startRename,
    doRename,
    doDeleteCategory,
  } = useCategories();

  // Esqueleto con la misma estructura que la pantalla real: al llegar los datos no hay salto de
  // layout ni de color. El texto queda para lectores de pantalla.
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl border border-fn-line bg-fn-ground p-3 md:p-8"
      >
        <span className="sr-only">Cargando datos...</span>
        <div aria-hidden className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-6">
          <div className="skeleton-pulse fn-card h-72 md:h-[8.75rem]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="skeleton-pulse fn-card h-[4.5rem]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl border border-fn-line bg-fn-ground p-3 text-fn-text md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-6">
        {/* Encabezado y Creación */}
        <div className="dash-enter [--i:0] fn-card flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center md:p-6">
          <div className="flex-1">
            <h1 className="text-2xl font-medium tracking-tight text-fn-text">Categorías</h1>
            <p className="mt-1 text-sm text-fn-muted">
              Organiza de dónde viene tu dinero y en qué lo gastas.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto">
            <TypeSelector value={newCategoryType} onChange={setNewCategoryType} />

            {/* Input para agregar: etiqueta pequeña encima, como en Cajas y en el Dashboard */}
            <label htmlFor="new-category-input" className="-mb-1.5 px-1 text-xs text-fn-muted">
              Nombre
            </label>
            <div className="flex items-center gap-2">
              <input
                id="new-category-input"
                name="new-category-input"
                type="text"
                placeholder="Nombre (ej. Restaurante)"
                className="fn-input h-10 w-full md:w-64"
                value={newCategoryValue}
                onChange={(e) => setNewCategoryValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                autoComplete="off"
              />
              <button
                onClick={handleAddCategory}
                aria-label="Agregar categoría"
                className="fn-button size-10 shrink-0 px-0"
              >
                <IconPlus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Categorías (Grid adaptativo) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, index) => {
            const isEditing = editingCategory === c.id;
            const isConfirming = confirmDeleteCategory === c.id;
            const isIncome = c.type === "income";

            return (
              <div
                key={c.id}
                style={{ "--i": Math.min(index + 1, 8) } as React.CSSProperties}
                // Alto fijo en escritorio: ver, editar y confirmar borrado ocupan el mismo espacio.
                className={cn(
                  "dash-enter fn-card flex items-center justify-between p-4 md:h-[4.5rem]",
                  // La tarjeta en edición se marca con un aro fino, sin cambiar su tamaño.
                  isEditing && "ring-1 ring-foreground/20",
                )}
              >
                <div className="h-full w-full">
                  {/* MODO EDICIÓN */}
                  {isEditing ? (
                    <div className="flex h-full w-full items-center gap-2">
                      <input
                        value={renameValue}
                        aria-label="Nombre de la categoría"
                        className="fn-input h-8 w-full"
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doRename(c.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => doRename(c.id)}
                        aria-label="Guardar"
                        title="Guardar"
                        className="fn-button size-8 shrink-0"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        aria-label="Cancelar"
                        title="Cancelar"
                        className="fn-icon-button flex size-8 shrink-0 items-center justify-center rounded-full text-fn-muted"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : isConfirming ? (
                    /* MODO CONFIRMACIÓN DE BORRADO */
                    <div className="flex h-full w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-negative">
                        ¿Borrar "{c.name}"?
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => doDeleteCategory(c.id)}
                          className="fn-button-danger px-3.5 py-1.5"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCategory(null)}
                          className="fn-button-soft px-3.5 py-1.5"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* MODO VISUALIZACIÓN NORMAL: el tipo se ve por ícono y texto, no solo por color */
                    <div className="flex h-full w-full items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3 pr-2">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full",
                            isIncome
                              ? "bg-linear-to-b from-success/30 to-success/15"
                              : "bg-linear-to-b from-negative/30 to-negative/15",
                          )}
                        >
                          {isIncome ? (
                            <IconArrowUpRight className="size-5 text-success" aria-hidden />
                          ) : (
                            <IconArrowDownRight className="size-5 text-negative" aria-hidden />
                          )}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-fn-text">{c.name}</span>
                          <span className="mt-0.5 text-xs capitalize text-fn-muted">
                            {isIncome ? "Ingreso" : "Gasto"}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => startRename(c.id, c.name)}
                          aria-label="Editar"
                          className="fn-icon-button flex size-9 items-center justify-center rounded-full text-fn-muted hover:text-fn-text"
                          title="Editar"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCategory(c.id)}
                          aria-label="Eliminar"
                          className="fn-icon-button flex size-9 items-center justify-center rounded-full text-fn-muted hover:text-negative"
                          title="Eliminar"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
