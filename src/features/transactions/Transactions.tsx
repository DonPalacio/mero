import React from "react";
import { IconTrash, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { cn, fmt } from "@/lib/utils";
import { useTransactions } from "./hooks/useTransactions";

export default function Transactions() {
  const {
    mediosDisponibles,
    categoriasDisponibles,
    movimientos,
    tipoSel,
    setTipoSel,
    monto,
    setMonto,
    selectedCat,
    setSelectedCat,
    selectedMedio,
    setSelectedMedio,
    fecha,
    setFecha,
    nota,
    setNota,
    fMsg,
    filtroCategoria,
    setFiltroCategoria,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    categoriasFiltradas,
    handleSubmit,
    handleDelete,
  } = useTransactions();

  const movimientosFiltrados = movimientos.filter(
    (mov) => (!filtroCategoria || mov.cajita === filtroCategoria) && mov.fecha.startsWith(selectedMonth)
  );

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 h-full overflow-y-auto min-h-0 bg-background rounded-tl-2xl">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registra tus nuevos movimientos y revisa tu historial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[550px] lg:h-[600px]">
            {/* shrink-0 evita que el título se encoja cuando hay mucho contenido abajo */}
            <h2 className="text-lg font-semibold text-card-foreground mb-4 shrink-0">
              Nuevo registro
            </h2>

            {/* Contenedor con scroll interno y clases para ocultar la barra */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Selector de Tipo */}
              <div className="flex p-1 bg-zinc-800 rounded-full shrink-0 border border-border">
                <button
                  type="button"
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors",
                    tipoSel === "gasto"
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setTipoSel("gasto");
                    setSelectedCat(null);
                  }}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors",
                    tipoSel === "ingreso"
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setTipoSel("ingreso");
                    setSelectedCat(null);
                  }}
                >
                  Ingreso
                </button>
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-sm font-medium text-foreground">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    className="flex h-11 w-full rounded-full border border-input bg-zinc-800 pl-7 pr-3 py-2 text-lg font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </div>
              </div>

              {/* Categorías (Chips) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {categoriasFiltradas.map((c) => {
                    const isActive = selectedCat === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedCat(isActive ? null : c.name)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          isActive
                            ? tipoSel === "gasto"
                              ? "bg-destructive border-destructive text-destructive-foreground"
                              : "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-zinc-800 border-border text-muted-foreground hover:bg-zinc-700",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                  {categoriasFiltradas.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No hay categorías para este tipo.
                    </span>
                  )}
                </div>
              </div>

              {/* Medio/Box (Chips) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-sm font-medium text-foreground">Medio de pago</label>
                <div className="flex flex-wrap gap-2">
                  {mediosDisponibles.map((m) => {
                    const isActive = selectedMedio === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMedio(isActive ? null : m)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          isActive
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-zinc-800 border-border text-muted-foreground hover:bg-zinc-700",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fecha y Nota */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Fecha</label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring scheme-dark"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Nota</label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                  />
                </div>
              </div>

              {fMsg && (
                <p className="text-sm text-destructive font-medium text-center shrink-0">{fMsg}</p>
              )}

              <button
                type="submit"
                className="mt-2 w-full flex h-10 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shrink-0"
              >
                Registrar movimiento
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: Historial / Tabla */}
          <div className="col-span-1 lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[800px] lg:h-[600px]">
            {/* Encabezado con los filtros de Mes y Categoría */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Últimas transacciones</h2>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  id="month-select"
                  name="month-select"
                  className="h-9 w-full lg:w-56 rounded-xl border border-input bg-zinc-800 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  id="category-select"
                  name="category-select"
                  className="h-9 w-full sm:w-48 rounded-xl border border-input bg-zinc-800 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={filtroCategoria || ""}
                  onChange={(e) => setFiltroCategoria(e.target.value === "" ? null : e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasDisponibles.map((c) => (
                    <option key={`filter-${c.name}`} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contenedor con scroll interno y clases para ocultar la barra */}
            <div className="flex flex-col gap-3 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {movimientosFiltrados.map((mov) => {
                const isGasto = mov.tipo === "gasto";
                return (
                  <div
                    key={mov.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors gap-3 shrink-0"
                  >
                    {/* Info principal */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-full shrink-0",
                          isGasto
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {isGasto ? <IconTrendingDown size={20} /> : <IconTrendingUp size={20} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground text-sm truncate">
                          {mov.cajita || "Sin categoría"}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          <span>{mov.fecha}</span>
                          <span>•</span>
                          <span className="truncate">{mov.medio}</span>
                          {mov.nota && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[100px] sm:max-w-[150px]">
                                {mov.nota}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Monto y Acciones */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span
                        className={cn(
                          "font-semibold whitespace-nowrap",
                          isGasto ? "text-foreground" : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {isGasto ? "-" : "+"}
                        {fmt(mov.monto)}
                      </span>
                      <button
                        onClick={() => handleDelete(mov.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        title="Eliminar"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Mensaje de vacío dinámico según los filtros */}
              {movimientosFiltrados.length === 0 && (
                <div className="py-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl shrink-0">
                  {filtroCategoria
                    ? `No hay transacciones registradas para "${filtroCategoria}" en este mes.`
                    : "No hay transacciones registradas en este mes."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
