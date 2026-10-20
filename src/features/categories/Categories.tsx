import React from "react";
import {
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconPlus,
  IconCategory2,
  IconArrowDownRight,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useCategories } from "./hooks/useCategories";

export default function Categories() {
  const {
    categories,
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl border border-fn-line bg-fn-ground p-3 text-fn-text md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-6">
        {/* Encabezado y Creación */}
        <div className="dash-enter [--i:0] fn-card flex flex-col justify-between gap-5 p-5 md:flex-row md:items-start md:p-6">
          <div className="flex flex-1 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full fn-chip">
              <IconCategory2 className="size-5 text-fn-brand" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fn-text">Categorías</h1>
              <p className="mt-1 text-sm text-fn-muted">
                Organiza de dónde viene tu dinero y en qué lo gastas.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto">
            {/* Selector de Tipo (Ingreso / Gasto): la opción activa va rellena, con ícono y texto */}
            <div className="flex rounded-full fn-chip p-1">
              <button
                type="button"
                aria-pressed={newCategoryType === "expense"}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
                  newCategoryType === "expense"
                    ? "bg-fn-text text-fn-ground"
                    : "text-fn-muted hover:text-fn-text",
                )}
                onClick={() => setNewCategoryType("expense")}
              >
                <IconArrowDownRight
                  className={cn("size-4", newCategoryType === "expense" && "text-negative")}
                  aria-hidden
                />
                Gasto
              </button>
              <button
                type="button"
                aria-pressed={newCategoryType === "income"}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
                  newCategoryType === "income"
                    ? "bg-fn-text text-fn-ground"
                    : "text-fn-muted hover:text-fn-text",
                )}
                onClick={() => setNewCategoryType("income")}
              >
                <IconArrowUpRight
                  className={cn("size-4", newCategoryType === "income" && "text-success")}
                  aria-hidden
                />
                Ingreso
              </button>
            </div>

            {/* Input para agregar */}
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
                className="fn-button h-10 shrink-0 px-4"
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
                className="dash-enter fn-card flex items-center justify-between p-4"
              >
                <div className="w-full">
                  {/* MODO EDICIÓN */}
                  {isEditing ? (
                    <div className="flex w-full items-center gap-2 rounded-2xl fn-chip p-2.5">
                      <input
                        value={renameValue}
                        aria-label="Nombre de la categoría"
                        className="fn-input h-9 w-full bg-fn-card"
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doRename(c.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => doRename(c.id)}
                        aria-label="Guardar"
                        title="Guardar"
                        className="fn-icon-button flex size-9 shrink-0 items-center justify-center rounded-full text-success"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        aria-label="Cancelar"
                        title="Cancelar"
                        className="fn-icon-button flex size-9 shrink-0 items-center justify-center rounded-full text-fn-muted"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : isConfirming ? (
                    /* MODO CONFIRMACIÓN DE BORRADO */
                    <div className="flex w-full items-center justify-between gap-2">
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
                    <div className="flex w-full items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3 pr-2">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full fn-chip">
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

          {categories.length === 0 && (
            <div className="col-span-full mt-4 rounded-3xl border-2 border-dashed border-fn-line p-8 text-center text-fn-muted">
              No tienes categorías creadas aún. Agrega una arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
