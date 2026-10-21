import React from "react";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCashRegister,
  IconCheck,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { cn, fmt, formatTypedAmount } from "@/lib/utils";
import { useTransactions } from "./hooks/useTransactions";

// Chip de selección (categoría y medio de pago): el activo va relleno y con ✓, no solo con color.
const chipClass = (isActive: boolean) =>
  cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
    isActive
      ? "bg-fn-text text-fn-ground"
      : "bg-fn-chip text-fn-muted hover:bg-fn-chip-hover hover:text-fn-text",
  );

export default function Transactions() {
  const {
    listRef,
    availableBoxes,
    isLoading,
    availableCategories,
    transactions,
    selectedType,
    setSelectedType,
    amount,
    setAmount,
    selectedCategory,
    setSelectedCategory,
    selectedBox,
    setSelectedBox,
    date,
    setDate,
    note,
    setNote,
    formMessage,
    categoryFilter,
    setCategoryFilter,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    filteredCategories,
    handleSubmit,
    handleDelete,
  } = useTransactions();

  const filteredTransactions = transactions.filter(
    (transaction) =>
      (!categoryFilter || transaction.category === categoryFilter) &&
      transaction.date.startsWith(selectedMonth),
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl border border-fn-line bg-fn-ground p-3 text-fn-text md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
        <div className="dash-enter [--i:0] flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full fn-card">
            <IconCashRegister className="size-5 text-foreground" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fn-text">Transacciones</h1>
            <p className="mt-1 text-sm text-fn-muted">
              Registra tus nuevos movimientos y revisa tu historial.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          <div className="dash-enter [--i:1] fn-card col-span-1 flex h-auto flex-col p-5 lg:h-[750px]">
            {/* shrink-0 evita que el título se encoja cuando hay mucho contenido abajo */}
            <h2 className="mb-4 shrink-0 text-[0.9375rem] font-semibold tracking-tight text-fn-text">
              Nuevo registro
            </h2>

            {/* Contenedor con scroll interno y clases para ocultar la barra */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Selector de Tipo: la opción activa va rellena, con ícono y texto */}
              <div className="flex shrink-0 rounded-full fn-chip p-1">
                <button
                  type="button"
                  aria-pressed={selectedType === "expense"}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
                    selectedType === "expense"
                      ? "fn-segment-active"
                      : "text-fn-muted hover:text-fn-text",
                  )}
                  onClick={() => {
                    setSelectedType("expense");
                    setSelectedCategory(null);
                  }}
                >
                  <IconArrowDownRight
                    className={cn("size-4", selectedType === "expense" && "text-negative")}
                    aria-hidden
                  />
                  Gasto
                </button>
                <button
                  type="button"
                  aria-pressed={selectedType === "income"}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
                    selectedType === "income"
                      ? "fn-segment-active"
                      : "text-fn-muted hover:text-fn-text",
                  )}
                  onClick={() => {
                    setSelectedType("income");
                    setSelectedCategory(null);
                  }}
                >
                  <IconArrowUpRight
                    className={cn("size-4", selectedType === "income" && "text-success")}
                    aria-hidden
                  />
                  Ingreso
                </button>
              </div>

              {/* Monto */}
              <div className="flex shrink-0 flex-col gap-1.5">
                <label htmlFor="transaction-amount" className="text-sm font-medium text-fn-text">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fn-muted">$</span>
                  {/* Texto y no number: el campo muestra el monto con formato (punto de miles y
                      coma decimal) mientras se escribe, hasta 3 decimales. */}
                  <input
                    id="transaction-amount"
                    name="transaction-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="fn-input h-12 w-full pl-8 text-lg font-semibold tabular-nums"
                    value={amount}
                    onChange={(e) => setAmount(formatTypedAmount(e.target.value, amount))}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Categorías (Chips) */}
              <div className="flex shrink-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-fn-text">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {isLoading &&
                    [0, 1, 2, 3].map((i) => (
                      <span
                        key={`sk-cat-${i}`}
                        aria-hidden
                        className="skeleton-pulse h-7 w-24 rounded-full fn-chip"
                      />
                    ))}
                  {filteredCategories.map((c) => {
                    const isActive = selectedCategory === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setSelectedCategory(isActive ? null : c.name)}
                        className={chipClass(isActive)}
                      >
                        {isActive && <IconCheck className="size-3.5" aria-hidden />}
                        {c.name}
                      </button>
                    );
                  })}
                  {!isLoading && filteredCategories.length === 0 && (
                    <span className="text-xs italic text-fn-muted">
                      No hay categorías para este tipo.
                    </span>
                  )}
                </div>
              </div>

              {/* Medio/Box (Chips) */}
              <div className="flex shrink-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-fn-text">Medio de pago</span>
                <div className="flex flex-wrap gap-2">
                  {isLoading &&
                    [0, 1, 2].map((i) => (
                      <span
                        key={`sk-box-${i}`}
                        aria-hidden
                        className="skeleton-pulse h-7 w-20 rounded-full fn-chip"
                      />
                    ))}
                  {availableBoxes.map((m) => {
                    const isActive = selectedBox === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setSelectedBox(isActive ? null : m)}
                        className={chipClass(isActive)}
                      >
                        {isActive && <IconCheck className="size-3.5" aria-hidden />}
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fecha y Nota */}
              <div className="grid shrink-0 grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="transaction-date" className="text-sm font-medium text-fn-text">
                    Fecha
                  </label>
                  <input
                    id="transaction-date"
                    name="transaction-date"
                    type="date"
                    className="fn-input scheme-dark h-10 w-full px-3"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="transaction-note" className="text-sm font-medium text-fn-text">
                    Nota
                  </label>
                  <input
                    id="transaction-note"
                    name="transaction-note"
                    type="text"
                    placeholder="Opcional..."
                    className="fn-input h-10 w-full"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              {formMessage && (
                <p className="flex shrink-0 items-center justify-center gap-1.5 text-center text-sm font-medium text-negative">
                  <IconAlertTriangle className="size-4 shrink-0" aria-hidden />
                  {formMessage}
                </p>
              )}

              <button type="submit" className="fn-button mt-2 h-11 w-full shrink-0 px-4">
                Registrar movimiento
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: Historial / Tabla */}
          <div className="dash-enter [--i:2] fn-card col-span-1 flex h-[800px] flex-col p-5 lg:col-span-2 lg:h-[750px]">
            {/* Encabezado con los filtros de Mes y Categoría */}
            <div className="mb-4 flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
                Últimas transacciones
              </h2>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <label htmlFor="month-select" className="sr-only">
                  Mes
                </label>
                <select
                  id="month-select"
                  name="month-select"
                  className="fn-input scheme-dark h-9 w-full px-3 lg:w-56"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <label htmlFor="category-select" className="sr-only">
                  Categoría
                </label>
                <select
                  id="category-select"
                  name="category-select"
                  className="fn-input scheme-dark h-9 w-full px-3 sm:w-48"
                  value={categoryFilter || ""}
                  onChange={(e) => setCategoryFilter(e.target.value === "" ? null : e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {availableCategories.map((c) => (
                    <option key={`filter-${c.name}`} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contenedor con scroll interno y clases para ocultar la barra */}
            <div
              ref={listRef}
              className="flex flex-col gap-2.5 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Esqueleto de carga: filas hundidas con la misma altura que las reales. */}
              {isLoading &&
                Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={`sk-${i}`}
                    aria-hidden
                    className="skeleton-pulse h-[4.5rem] shrink-0 rounded-2xl fn-chip sm:h-16"
                  />
                ))}
              {filteredTransactions.map((transaction) => {
                const isExpense = transaction.type === "expense";
                return (
                  <div
                    key={transaction.id}
                    data-tx-row
                    className="flex shrink-0 flex-col justify-between gap-3 rounded-2xl fn-chip p-3 transition-colors hover:bg-fn-chip-hover sm:flex-row sm:items-center"
                  >
                    {/* Info principal */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fn-card">
                        {isExpense ? (
                          <IconTrendingDown size={20} className="text-negative" aria-hidden />
                        ) : (
                          <IconTrendingUp size={20} className="text-success" aria-hidden />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-fn-text">
                          {transaction.category || "Sin categoría"}
                        </span>
                        {/* overflow-x-auto propio: permite ver la Nota completa con scroll
                            horizontal por registro, sin afectar el scroll-y de la lista
                            ni ensanchar la fila (min-w-0/flex-1 arriba acotan su ancho). */}
                        <div
                          data-tx-scroll
                          className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-fn-muted [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        >
                          <span className="shrink-0">{transaction.date}</span>
                          <span className="shrink-0">•</span>
                          <span className="shrink-0">{transaction.box}</span>
                          {transaction.note && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="shrink-0">{transaction.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Monto y Acciones */}
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={cn(
                          "whitespace-nowrap font-bold tabular-nums",
                          isExpense ? "text-fn-text" : "text-success",
                        )}
                      >
                        {isExpense ? "-" : "+"}
                        {fmt(transaction.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        aria-label="Eliminar"
                        className="fn-icon-button flex size-8 items-center justify-center rounded-full text-fn-muted hover:text-negative"
                        title="Eliminar"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Mensaje de vacío dinámico según los filtros */}
              {!isLoading && filteredTransactions.length === 0 && (
                <div className="shrink-0 rounded-3xl border-2 border-dashed border-fn-line py-10 text-center text-fn-muted">
                  {categoryFilter
                    ? `No hay transacciones registradas para "${categoryFilter}" en este mes.`
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
