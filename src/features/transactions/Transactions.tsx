import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCheck,
  IconPlus,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { cn, fmt, formatTypedAmount } from "@/lib/utils";
import TypeSelector from "@/components/TypeSelector";
import { useTransactions } from "./hooks/useTransactions";

// Chip de selección (categoría y medio de pago): el activo lleva el relleno suave del selector
// Gasto/Ingreso y un ✓, no solo color.
const chipClass = (isActive: boolean) =>
  cn(
    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fn-brand",
    isActive
      ? "border-transparent bg-foreground/20 text-fn-text"
      : "border-fn-line bg-fn-chip text-fn-muted hover:bg-fn-chip-hover hover:text-fn-text",
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
        <div className="dash-enter [--i:0]">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-fn-text">Transacciones</h1>
            <p className="mt-1 text-sm text-fn-muted">
              Registra tus nuevos movimientos y revisa tu historial.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {/* COLUMNA IZQUIERDA: un solo formulario en una sola tarjeta con dos zonas, sin separación. La de arriba
              lleva el tipo y el monto; la de abajo, los
              detalles y el botón. */}
          <form
            onSubmit={handleSubmit}
            className="dash-enter [--i:1] fn-card col-span-1 flex flex-col overflow-hidden lg:h-[750px]"
          >
            <div className="flex shrink-0 flex-col gap-6 p-5 sm:p-6">
              <h2 className="text-[0.9375rem] font-semibold tracking-tight text-fn-text">
                Nuevo registro
              </h2>

              <TypeSelector
                value={selectedType}
                onChange={(type) => {
                  setSelectedType(type);
                  setSelectedCategory(null);
                }}
              />

              {/* Monto: la cifra grande de la tarjeta, sin caja de campo */}
              <div className="flex flex-col gap-1">
                <label htmlFor="transaction-amount" className="px-1 text-xs text-fn-muted">
                  Monto
                </label>
                <div className="flex items-baseline gap-2 border-b border-fn-line pb-1 focus-within:border-fn-text">
                  <span className="pl-1 text-3xl font-medium text-fn-muted">$</span>
                  {/* Texto y no number: el campo muestra el monto con formato (punto de miles y
                      coma decimal) mientras se escribe, hasta 3 decimales. */}
                  <input
                    id="transaction-amount"
                    name="transaction-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full min-w-0 bg-transparent text-3xl font-semibold tabular-nums text-fn-text outline-none placeholder:text-fn-muted"
                    value={amount}
                    onChange={(e) => setAmount(formatTypedAmount(e.target.value, amount))}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:p-6">
              <h2 className="shrink-0 text-[0.9375rem] font-semibold tracking-tight text-fn-text">
                Detalles
              </h2>

              {/* Contenedor con scroll interno y clases para ocultar la barra */}
              <div className="flex min-h-0 flex-col gap-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Categorías (Chips) */}
                <div className="flex shrink-0 flex-col gap-1.5">
                  <span className="px-1 text-xs text-fn-muted">Categoría</span>
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
                  <span className="px-1 text-xs text-fn-muted">Medio de pago</span>
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
              </div>

              {formMessage && (
                <p className="flex shrink-0 items-center justify-center gap-1.5 text-center text-sm font-medium text-negative">
                  <IconAlertTriangle className="size-4 shrink-0" aria-hidden />
                  {formMessage}
                </p>
              )}

              {/* Fecha, nota y el botón de registrar en una sola fila, pegada a los chips (sin hueco), como el campo y el "+"
                  de los formularios de Cajas y Categorías. */}
              <div className="flex shrink-0 items-end gap-2">
                <div className="flex w-36 shrink-0 flex-col gap-1.5">
                  <label htmlFor="transaction-date" className="px-1 text-xs text-fn-muted">
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
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor="transaction-note" className="px-1 text-xs text-fn-muted">
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
                <button
                  type="submit"
                  aria-label="Registrar movimiento"
                  title="Registrar movimiento"
                  className="fn-button size-10 shrink-0 px-0"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </form>

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
              className="flex flex-col gap-1 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                    className="flex shrink-0 flex-col justify-between gap-3 border-b border-fn-line py-3 last:border-b-0 sm:flex-row sm:items-center"
                  >
                    {/* Info principal */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          isExpense ? "bg-negative/15" : "bg-success/15",
                        )}
                      >
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
                          "whitespace-nowrap font-semibold tabular-nums",
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
