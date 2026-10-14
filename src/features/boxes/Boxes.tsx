import React from "react";
import { IconEdit, IconTrash, IconCheck, IconX, IconPlus } from "@tabler/icons-react";
import { useBoxes } from "./hooks/useBoxes";
import { fechaLocalISO, fmt } from "@/lib/utils";
import { formatearRendimiento, rendimientoDiarioEstimado } from "@/lib/rendimiento";

export default function Boxes() {
  const {
    medios,
    newMedioValue,
    setNewMedioValue,
    editingMedio,
    setEditingMedio,
    renameMedioValue,
    setRenameMedioValue,
    confirmDeleteMedio,
    setConfirmDeleteMedio,
    tasaValue,
    setTasaValue,
    desdeValue,
    setDesdeValue,
    handleAddMedio,
    startEditMedio,
    doSaveMedio,
    doDeleteMedio,
  } = useBoxes();

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 h-full overflow-y-auto bg-background rounded-tl-2xl">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Encabezado y Creación */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cajas</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Administra las cuentas, tarjetas o lugares donde guardas tu dinero.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              id="new-medio-input"
              name="new-medio-input"
              type="text"
              placeholder="Nueva caja"
              className="flex h-10 w-full md:w-64 rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={newMedioValue}
              onChange={(e) => setNewMedioValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMedio()}
              autoComplete="off"
            />
            <button
              onClick={handleAddMedio}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <IconPlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Lista de Medios (Grid adaptativo: 1 col celular, 2 tablet, 3 PC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medios.map((m) => {
            const isEditing = editingMedio === m.id;
            const isConfirming = confirmDeleteMedio === m.id;

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm transition-all hover:shadow-md"
              >
                {/* MODO EDICIÓN */}
                {isEditing ? (
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center gap-2">
                      <input
                        id={`rename-medio-${m.id}`}
                        name={`rename-medio-${m.id}`}
                        type="text"
                        value={renameMedioValue}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) => setRenameMedioValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveMedio(m.id)}
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        onClick={() => doSaveMedio(m.id)}
                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingMedio(null)}
                        className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Rendimiento E.A.: vacío = la caja no rinde */}
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`tasa-medio-${m.id}`}
                        className="text-xs text-muted-foreground shrink-0"
                      >
                        Rendimiento E.A. (%)
                      </label>
                      <input
                        id={`tasa-medio-${m.id}`}
                        name={`tasa-medio-${m.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 9,30"
                        value={tasaValue}
                        className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) => setTasaValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveMedio(m.id)}
                        autoComplete="off"
                      />
                    </div>

                    {/* Solo al activar la tasa: desde qué día se acredita (los atrasados se
                        acreditan de una vez) */}
                    {m.tasa_ea === null && tasaValue.trim() !== "" && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`desde-medio-${m.id}`}
                          className="text-xs text-muted-foreground shrink-0"
                        >
                          Rinde desde
                        </label>
                        <input
                          id={`desde-medio-${m.id}`}
                          name={`desde-medio-${m.id}`}
                          type="date"
                          max={fechaLocalISO()}
                          value={desdeValue}
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          onChange={(e) => setDesdeValue(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ) : isConfirming ? (
                  /* MODO CONFIRMACIÓN DE BORRADO */
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium text-destructive">
                      ¿Borrar "{m.nombre}"?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => doDeleteMedio(m.id)}
                        className="text-xs font-medium bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors"
                      >
                        Sí, borrar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMedio(null)}
                        className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO VISUALIZACIÓN NORMAL */
                  <>
                    <div className="min-w-0 pr-2">
                      <span className="block font-medium text-card-foreground truncate">
                        {m.nombre}
                      </span>
                      <span className="block text-sm text-muted-foreground">{fmt(m.saldo)}</span>
                      {m.tasa_ea !== null && (
                        <span className="block text-xs text-muted-foreground">
                          {m.tasa_ea.toLocaleString("es-CO")} % E.A. · ≈{" "}
                          {formatearRendimiento(rendimientoDiarioEstimado(m.saldo, m.tasa_ea))} al
                          día
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditMedio(m)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
                        title="Editar"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMedio(m.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        title="Eliminar"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {medios.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No tienes medios creados aún. Agrega uno arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
