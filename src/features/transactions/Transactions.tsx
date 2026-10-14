import React from "react";
import { IconTrash, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { cn, fmt, formatTypedAmount } from "@/lib/utils";
import { useTransactions } from "./hooks/useTransactions";

export default function Transactions() {
  const {
    listRef,
    availableBoxes,
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
    <div className="flex flex-col flex-1 p-4 md:p-10 h-full overflow-y-auto min-h-0 bg-background rounded-tl-2xl">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registra tus nuevos movimientos y revisa tu historial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-auto lg:h-[750px]">
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
                    selectedType === "expense"
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setSelectedType("expense");
                    setSelectedCategory(null);
                  }}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors",
                    selectedType === "income"
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setSelectedType("income");
                    setSelectedCategory(null);
                  }}
                >
                  Ingreso
                </button>
              </div>

              {/* Monto */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <label htmlFor="transaction-amount" className="text-sm font-medium text-foreground">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  {/* Texto y no number: el campo muestra el monto con formato (punto de miles y
                      coma decimal) mientras se escribe, hasta 3 decimales. */}
                  <input
                    id="transaction-amount"
                    name="transaction-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="flex h-11 w-full rounded-full border border-input bg-zinc-800 pl-7 pr-3 py-2 text-lg font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                    value={amount}
                    onChange={(e) => setAmount(formatTypedAmount(e.target.value, amount))}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Categorías (Chips) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-sm font-medium text-foreground">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map((c) => {
                    const isActive = selectedCategory === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedCategory(isActive ? null : c.name)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          isActive
                            ? selectedType === "expense"
                              ? "bg-destructive border-destructive text-destructive-foreground"
                              : "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-zinc-800 border-border text-muted-foreground hover:bg-zinc-700",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                  {filteredCategories.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No hay categorías para este tipo.
                    </span>
                  )}
                </div>
              </div>

              {/* Medio/Box (Chips) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-sm font-medium text-foreground">Medio de pago</span>
                <div className="flex flex-wrap gap-2">
                  {availableBoxes.map((m) => {
                    const isActive = selectedBox === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedBox(isActive ? null : m)}
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
                  <label htmlFor="transaction-date" className="text-sm font-medium text-foreground">
                    Fecha
                  </label>
                  <input
                    id="transaction-date"
                    name="transaction-date"
                    type="date"
                    className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring scheme-dark"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="transaction-note" className="text-sm font-medium text-foreground">
                    Nota
                  </label>
                  <input
                    id="transaction-note"
                    name="transaction-note"
                    type="text"
                    placeholder="Opcional..."
                    className="flex h-10 w-full rounded-full border border-input bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              {formMessage && (
                <p className="text-sm text-destructive font-medium text-center shrink-0">
                  {formMessage}
                </p>
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
          <div className="col-span-1 lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[800px] lg:h-[750px]">
            {/* Encabezado con los filtros de Mes y Categoría */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Últimas transacciones</h2>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <label htmlFor="month-select" className="sr-only">
                  Mes
                </label>
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

                <label htmlFor="category-select" className="sr-only">
                  Categoría
                </label>
                <select
                  id="category-select"
                  name="category-select"
                  className="h-9 w-full sm:w-48 rounded-xl border border-input bg-zinc-800 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="flex flex-col gap-3 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {filteredTransactions.map((transaction) => {
                const isExpense = transaction.type === "expense";
                return (
                  <div
                    key={transaction.id}
                    data-tx-row
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors gap-3 shrink-0"
                  >
                    {/* Info principal */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "p-2 rounded-full shrink-0",
                          isExpense
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {isExpense ? <IconTrendingDown size={20} /> : <IconTrendingUp size={20} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground text-sm truncate">
                          {transaction.category || "Sin categoría"}
                        </span>
                        {/* overflow-x-auto propio: permite ver la Nota completa con scroll
                            horizontal por registro, sin afectar el scroll-y de la lista
                            ni ensanchar la fila (min-w-0/flex-1 arriba acotan su ancho). */}
                        <div
                          data-tx-scroll
                          className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span
                        className={cn(
                          "font-semibold whitespace-nowrap",
                          isExpense ? "text-foreground" : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {isExpense ? "-" : "+"}
                        {fmt(transaction.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(transaction.id)}
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
              {filteredTransactions.length === 0 && (
                <div className="py-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl shrink-0">
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
