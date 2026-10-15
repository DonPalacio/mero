import React from "react";
import { IconEdit, IconTrash, IconCheck, IconX, IconPlus } from "@tabler/icons-react";
import { useBoxes } from "./hooks/useBoxes";
import BankRatesHelp from "./components/BankRatesHelp";
import { localISODate, fmt } from "@/lib/utils";
import { formatYield, estimatedDailyYield } from "@/lib/yield";

export default function Boxes() {
  const {
    boxes,
    newBoxValue,
    setNewBoxValue,
    newEaRateValue,
    setNewEaRateValue,
    editingBox,
    setEditingBox,
    renameBoxValue,
    setRenameBoxValue,
    confirmDeleteBox,
    setConfirmDeleteBox,
    confirmResetBox,
    setConfirmResetBox,
    doResetYields,
    eaRateValue,
    setEaRateValue,
    fromValue,
    setFromValue,
    handleAddBox,
    startEditBox,
    doSaveBox,
    doDeleteBox,
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

          {/* Orden en celular: nombre, E.A., botón + y botón de ayuda. Desde sm: 2 columnas,
              nombre y + arriba; E.A. y ayuda abajo (la ayuda queda justo debajo del +). */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto] sm:items-center">
            <input
              id="new-box-input"
              name="new-box-input"
              type="text"
              placeholder="Nueva caja"
              className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:col-start-1 sm:row-start-1 sm:w-64"
              value={newBoxValue}
              onChange={(e) => setNewBoxValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
              autoComplete="off"
            />
            {/* Rendimiento E.A. de la caja nueva: opcional, vacío = no rinde */}
            <input
              id="new-box-ea-rate-input"
              name="new-box-ea-rate-input"
              type="text"
              inputMode="decimal"
              placeholder="Rendimiento E.A. % (ej: 9,30)"
              className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:col-start-1 sm:row-start-2 sm:w-64"
              value={newEaRateValue}
              onChange={(e) => setNewEaRateValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
              autoComplete="off"
            />
            <button
              onClick={handleAddBox}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:col-start-2 sm:row-start-1 sm:w-14 sm:px-0"
            >
              <IconPlus className="h-5 w-5" />
            </button>
            <BankRatesHelp className="w-full sm:col-start-2 sm:row-start-2 sm:w-14 sm:px-0" />
          </div>
        </div>

        {/* Lista de Medios (Grid adaptativo: 1 col celular, 2 tablet, 3 PC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boxes.map((m) => {
            const isEditing = editingBox === m.id;
            const isConfirming = confirmDeleteBox === m.id;
            const isResetting = confirmResetBox === m.id;

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
                        id={`rename-box-${m.id}`}
                        name={`rename-box-${m.id}`}
                        type="text"
                        value={renameBoxValue}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) => setRenameBoxValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveBox(m.id)}
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        onClick={() => doSaveBox(m.id)}
                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingBox(null)}
                        className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Rendimiento E.A.: vacío = la caja no rinde */}
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`ea-rate-box-${m.id}`}
                        className="text-xs text-muted-foreground shrink-0"
                      >
                        Rendimiento E.A. (%)
                      </label>
                      <input
                        id={`ea-rate-box-${m.id}`}
                        name={`ea-rate-box-${m.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 9,30"
                        value={eaRateValue}
                        className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        onChange={(e) => setEaRateValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveBox(m.id)}
                        autoComplete="off"
                      />
                    </div>

                    {/* Desde qué día rinde. Al activar la tasa se elige libremente; si la caja ya
                        rinde solo se puede mover hacia atrás (los días anteriores se acreditan
                        de una vez; los ya acreditados no cambian). */}
                    {eaRateValue.trim() !== "" && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`from-box-${m.id}`}
                          className="text-xs text-muted-foreground shrink-0"
                        >
                          Rinde desde
                        </label>
                        <input
                          id={`from-box-${m.id}`}
                          name={`from-box-${m.id}`}
                          type="date"
                          max={m.yield_from ?? localISODate()}
                          value={fromValue}
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          onChange={(e) => setFromValue(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ) : isConfirming ? (
                  /* MODO CONFIRMACIÓN DE BORRADO */
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium text-destructive">
                      ¿Deseas eliminar la caja "{m.name}"?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => doDeleteBox(m.id)}
                        className="text-xs font-medium bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteBox(null);
                          // La caja se conserva: si rinde por E.A., se ofrece quitar solo ese dinero.
                          if (m.ea_rate !== null) setConfirmResetBox(m.id);
                        }}
                        className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : isResetting ? (
                  /* MODO CONFIRMACIÓN DE REINICIO DE RENDIMIENTOS */
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      ¿Eliminar también el dinero generado por el E.A. de "{m.name}"?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => doResetYields(m.id)}
                        className="text-xs font-medium bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors"
                      >
                        Sí, eliminarlo
                      </button>
                      <button
                        onClick={() => setConfirmResetBox(null)}
                        className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO VISUALIZACIÓN NORMAL */
                  <>
                    <div className="min-w-0 pr-2">
                      <span className="block font-medium text-card-foreground truncate">
                        {m.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">{fmt(m.balance)}</span>
                      {m.ea_rate !== null && (
                        <span className="block text-xs text-muted-foreground">
                          {m.ea_rate.toLocaleString("es-CO")}% E.A. · ≈{" "}
                          {formatYield(estimatedDailyYield(m.balance, m.ea_rate))} al día
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditBox(m)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
                        title="Editar"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteBox(m.id)}
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

          {boxes.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No tienes medios creados aún. Agrega uno arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
