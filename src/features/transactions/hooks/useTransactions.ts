import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TransactionRow } from "../services/transactions.service";
import { categoriesQuery, boxesQuery, monthTransactionsQuery } from "@/lib/queries";
import { useRowHorizontalScrollForwarding } from "./useRowHorizontalScrollForwarding";
import { useTransactionMonths, usePrefetchAdjacentMonths } from "./useTransactionMonths";
import { useTransactionForm } from "./useTransactionForm";

interface CategoryBase {
  name: string;
  type: "expense" | "income";
}

const NO_TRANSACTIONS: TransactionRow[] = [];

// Estado y caché de la pantalla de movimientos. Une las lecturas (mes visto, medios y
// categorías) con las piezas especializadas: scroll de las filas, selector de meses y formulario.
export function useTransactions() {
  const listRef = useRowHorizontalScrollForwarding();

  const { currentMonth, selectedMonth, setSelectedMonth, monthOptions } = useTransactionMonths();

  // Solo se pide el mes que se está viendo; cada mes se cachea por separado.
  const transactionsQ = useQuery(monthTransactionsQuery(selectedMonth));
  const boxesQ = useQuery(boxesQuery);
  const categoriesQ = useQuery(categoriesQuery);

  const transactions = transactionsQ.data ?? NO_TRANSACTIONS;
  const isLoading = transactionsQ.isPending || boxesQ.isPending || categoriesQ.isPending;

  usePrefetchAdjacentMonths(selectedMonth, currentMonth, !isLoading);

  // Los selectores se muestran ordenados por nombre
  const boxesData = useMemo(
    () => [...(boxesQ.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [boxesQ.data],
  );
  const categoriesData = useMemo(
    () => [...(categoriesQ.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [categoriesQ.data],
  );

  const form = useTransactionForm(boxesData, categoriesData);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const availableBoxes = boxesData.map((m) => m.name);
  const availableCategories: CategoryBase[] = categoriesData.map((c) => ({
    name: c.name,
    type: c.type,
  }));

  const filteredCategories = availableCategories.filter((c) => c.type === form.selectedType);

  return {
    listRef,
    availableBoxes,
    availableCategories,
    transactions,
    isLoading,
    selectedType: form.selectedType,
    setSelectedType: form.setSelectedType,
    amount: form.amount,
    setAmount: form.setAmount,
    selectedCategory: form.selectedCategory,
    setSelectedCategory: form.setSelectedCategory,
    selectedBox: form.selectedBox,
    setSelectedBox: form.setSelectedBox,
    date: form.date,
    setDate: form.setDate,
    note: form.note,
    setNote: form.setNote,
    formMessage: form.formMessage,
    categoryFilter,
    setCategoryFilter,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    filteredCategories,
    handleSubmit: form.handleSubmit,
    handleDelete: form.handleDelete,
  };
}
