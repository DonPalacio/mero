import React from "react";
import {
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconPlus,
  IconPackages,
  IconBuildingBank,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useBoxes } from "./hooks/useBoxes";
import BankRatesHelp from "./components/BankRatesHelp";
import AnimatedNumber from "@/components/AnimatedNumber";
import { cn, localISODate } from "@/lib/utils";
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
    <div className="flex h-full flex-1 flex-col overflow-y-auto rounded-tl-2xl border border-fn-line bg-fn-ground p-3 text-fn-text md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-6">
        {/* Encabezado y Creación */}
        <div className="dash-enter [--i:0] fn-card flex flex-col justify-between gap-5 p-5 md:flex-row md:items-end md:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full fn-chip">
              <IconPackages className="size-5 text-fn-brand" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fn-text">Cajas</h1>
              <p className="mt-1 text-sm text-fn-muted">
                Administra las cuentas, tarjetas o lugares donde guardas tu dinero.
              </p>
            </div>
          </div>

          {/* Orden en celular: nombre, E.A., botón + y botón de ayuda. Desde sm: 2 columnas,
              nombre y + arriba; E.A. y ayuda abajo (la ayuda queda justo debajo del +). */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto] sm:items-center">
            <input
              id="new-box-input"
              name="new-box-input"
              type="text"
              placeholder="Nueva caja"
              className="fn-input h-10 w-full sm:col-start-1 sm:row-start-1 sm:w-64"
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
              className="fn-input h-10 w-full sm:col-start-1 sm:row-start-2 sm:w-64"
              value={newEaRateValue}
              onChange={(e) => setNewEaRateValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
              autoComplete="off"
            />
            <button
              onClick={handleAddBox}
              aria-label="Agregar caja"
              className="fn-button h-10 w-full px-4 sm:col-start-2 sm:row-start-1 sm:w-14 sm:px-0"
            >
              <IconPlus className="h-5 w-5" />
            </button>
            <BankRatesHelp className="w-full sm:col-start-2 sm:row-start-2 sm:w-14 sm:px-0" />
          </div>
        </div>

        {/* Lista de Medios (Grid adaptativo: 1 col celular, 2 tablet, 3 PC) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boxes.map((m, index) => {
            const isEditing = editingBox === m.id;
            const isConfirming = confirmDeleteBox === m.id;
            const isResetting = confirmResetBox === m.id;

            return (
              <div
                key={m.id}
                style={{ "--i": Math.min(index + 1, 8) } as React.CSSProperties}
                // Alto fijo y compacto en escritorio: ver, editar y confirmar ocupan el mismo espacio, así
                // la tarjeta (y la cuadrícula) no cambia de tamaño al pulsar Editar.
                className="dash-enter fn-card flex flex-col p-3.5 md:h-40"
              >
                {/* MODO EDICIÓN */}
                {isEditing ? (
                  <div className="flex h-full w-full flex-col justify-between gap-1.5 rounded-2xl fn-chip p-2.5">
                    <div className="flex w-full items-center gap-2">
                      <input
                        id={`rename-box-${m.id}`}
                        name={`rename-box-${m.id}`}
                        type="text"
                        value={renameBoxValue}
                        aria-label="Nombre de la caja"
                        className="fn-input h-8 w-full bg-fn-card"
                        onChange={(e) => setRenameBoxValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveBox(m.id)}
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        onClick={() => doSaveBox(m.id)}
                        aria-label="Guardar"
                        title="Guardar"
                        className="fn-icon-button flex size-8 shrink-0 items-center justify-center rounded-full text-success"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingBox(null)}
                        aria-label="Cancelar"
                        title="Cancelar"
                        className="fn-icon-button flex size-8 shrink-0 items-center justify-center rounded-full text-fn-muted"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Rendimiento E.A.: vacío = la caja no rinde. Etiqueta de ancho fijo para que
                        los campos queden alineados. */}
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`ea-rate-box-${m.id}`}
                        className="w-28 shrink-0 text-xs text-fn-muted"
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
                        className="fn-input h-8 min-w-0 flex-1 bg-fn-card"
                        onChange={(e) => setEaRateValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doSaveBox(m.id)}
                        autoComplete="off"
                      />
                    </div>

                    {/* Desde qué día rinde. Al activar la tasa se elige libremente; si la caja ya
                        rinde solo se puede mover hacia atrás (los días anteriores se acreditan
                        de una vez; los ya acreditados no cambian). La fila siempre ocupa su
                        espacio: sin tasa queda invisible (y fuera del foco) para que el alto no
                        cambie al escribir. */}
                    <div
                      className={cn(
                        "flex items-center gap-2",
                        eaRateValue.trim() === "" && "invisible",
                      )}
                    >
                      <label
                        htmlFor={`from-box-${m.id}`}
                        className="w-28 shrink-0 text-xs text-fn-muted"
                      >
                        Rinde desde
                      </label>
                      <input
                        id={`from-box-${m.id}`}
                        name={`from-box-${m.id}`}
                        type="date"
                        max={m.yield_from ?? localISODate()}
                        value={fromValue}
                        className="fn-input scheme-dark h-8 min-w-0 flex-1 bg-fn-card"
                        onChange={(e) => setFromValue(e.target.value)}
                      />
                    </div>
                  </div>
                ) : isConfirming ? (
                  /* MODO CONFIRMACIÓN DE BORRADO */
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                    <span className="text-sm font-medium text-negative">
                      ¿Deseas eliminar la caja "{m.name}"?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => doDeleteBox(m.id)}
                        className="fn-button-danger px-3.5 py-1.5"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteBox(null);
                          // La caja se conserva: si rinde por E.A., se ofrece quitar solo ese dinero.
                          if (m.ea_rate !== null) setConfirmResetBox(m.id);
                        }}
                        className="fn-button-soft px-3.5 py-1.5"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : isResetting ? (
                  /* MODO CONFIRMACIÓN DE REINICIO DE RENDIMIENTOS */
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                    <span className="text-sm font-medium text-fn-text">
                      ¿Eliminar también el dinero generado por el E.A. de "{m.name}"?
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => doResetYields(m.id)}
                        className="fn-button-danger px-3.5 py-1.5"
                      >
                        Sí, eliminarlo
                      </button>
                      <button
                        onClick={() => setConfirmResetBox(null)}
                        className="fn-button-soft px-3.5 py-1.5"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODO VISUALIZACIÓN NORMAL: tres franjas fijas (nombre y acciones, saldo,
                      rendimiento). La franja del rendimiento reserva su alto aunque la caja no
                      rinda, para que todas las tarjetas midan igual. */
                  <div className="flex h-full w-full flex-col justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full fn-chip">
                        <IconBuildingBank className="size-5 text-fn-muted" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-fn-text">
                        {m.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => startEditBox(m)}
                          aria-label="Editar"
                          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-muted hover:text-fn-text"
                          title="Editar"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteBox(m.id)}
                          aria-label="Eliminar"
                          className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-muted hover:text-negative"
                          title="Eliminar"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="@container min-w-0">
                      <AnimatedNumber
                        value={m.balance}
                        className={`block whitespace-nowrap text-[min(1.75rem,11cqw)] font-bold leading-none tracking-tight tabular-nums ${m.balance < 0 ? "text-negative" : "text-fn-text"}`}
                      />
                    </div>

                    <div className="flex min-h-6 items-center">
                      {m.ea_rate !== null && (
                        <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full fn-chip px-2.5 py-1 text-xs text-fn-muted">
                          <IconTrendingUp className="size-3.5 shrink-0 text-success" aria-hidden />
                          <span className="truncate">
                            {m.ea_rate.toLocaleString("es-CO")}% E.A. · ≈{" "}
                            {formatYield(estimatedDailyYield(m.balance, m.ea_rate))} al día
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {boxes.length === 0 && (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-fn-line p-8 text-center text-fn-muted">
              No tienes medios creados aún. Agrega uno arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
