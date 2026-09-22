import React from "react";
import { IconEdit, IconTrash, IconCheck, IconX, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useCategories } from "./hooks/useCategories";

export default function Categories() {
  const {
    categorias,
    newCatValue,
    setNewCatValue,
    newCatTipo,
    setNewCatTipo,
    editingCat,
    setEditingCat,
    renameValue,
    setRenameValue,
    confirmDeleteCat,
    setConfirmDeleteCat,
    handleAddCat,
    startRename,
    doRename,
    doDeleteCat,
  } = useCategories();

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 h-full overflow-y-auto min-h-0 bg-background rounded-tl-2xl">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Encabezado y Creación */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Organiza de dónde viene tu dinero y en qué lo gastas.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {/* Selector de Tipo (Ingreso / Gasto) */}
            <div className="flex p-1 bg-background rounded-full">
              <button
                className={cn(
                  "flex-1 px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                  newCatTipo === "gasto"
                    ? "bg-secondary text-destructive shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setNewCatTipo("gasto")}
              >
                Gasto
              </button>
              <button
                className={cn(
                  "flex-1 px-4 py-1.5 text-sm font-medium rounded-xl transition-colors",
                  newCatTipo === "ingreso"
                    ? "bg-secondary text-emerald-600 dark:text-emerald-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setNewCatTipo("ingreso")}
              >
                Ingreso
              </button>
            </div>

            {/* Input para agregar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nombre (ej. Supermercado)"
                className="flex h-10 w-full md:w-64 rounded-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={newCatValue}
                onChange={(e) => setNewCatValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCat()}
              />
              <button
                onClick={handleAddCat}
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <IconPlus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Categorías (Grid adaptativo) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((c) => {
            const isEditing = editingCat === c.name;
            const isConfirming = confirmDeleteCat === c.name;
            const isIngreso = c.tipo === "ingreso";

            return (
              <div
                key={c.name}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm transition-all hover:shadow-md relative overflow-hidden"
              >
                {/* Borde de color sutil a la izquierda para identificar rápido */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    isIngreso ? "bg-emerald-500" : "bg-destructive",
                  )}
                />

                <div className="w-full pl-2">
                  {/* MODO EDICIÓN */}
                  {isEditing ? (
                    <div className="flex w-full items-center gap-2">
                      <input
                        value={renameValue}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doRename(c.name)}
                        autoFocus
                      />
                      <button
                        onClick={() => doRename(c.name)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full transition-colors shrink-0"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCat(null)}
                        className="p-1.5 text-muted-foreground hover:bg-secondary rounded-full transition-colors shrink-0"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : isConfirming ? (
                    /* MODO CONFIRMACIÓN DE BORRADO */
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium text-destructive truncate">
                        ¿Borrar "{c.name}"?
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => doDeleteCat(c.name)}
                          className="text-xs font-medium bg-destructive text-destructive-foreground px-2.5 py-1.5 rounded-md hover:bg-destructive/90 transition-colors"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCat(null)}
                          className="text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* MODO VISUALIZACIÓN NORMAL */
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-medium text-card-foreground truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground capitalize mt-0.5">
                          {c.tipo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startRename(c.name)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
                          title="Editar"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCat(c.name)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
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

          {categorias.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-4">
              No tienes categorías creadas aún. Agrega una arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
