import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoriesService, type Category as CategoryRow } from "../services/categories.service";
import type { OperationResult } from "@/lib/supabase-errors";
import {
  addCategoryOptimistic,
  catalogRenamedConfirmed,
  categoryCreatedConfirmed,
  categoryDeletedConfirmed,
  categoriesQuery,
  removeCategoryOptimistic,
  renameCategoryOptimistic,
} from "@/lib/queries";
import { generateUuid } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  budget: number;
}

function mapCategory(c: CategoryRow): Category {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    budget: Number(c.monthly_budget),
  };
}

export function useCategories() {
  const queryClient = useQueryClient();
  const categoriesQ = useQuery(categoriesQuery);
  const categories = useMemo(() => (categoriesQ.data ?? []).map(mapCategory), [categoriesQ.data]);
  const isLoading = categoriesQ.isPending;

  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">("expense");
  const [editingCategory, setEditingCategory] = useState<string | null>(null); // id
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null); // id

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Renombrar o eliminar
  // una categoría recién creada espera a su alta: si no, el UPDATE/DELETE llegaría antes que el
  // INSERT y no encontraría nada.
  const pendingCreations = useRef(new Map<string, Promise<boolean>>());

  async function handleAddCategory() {
    const v = newCategoryValue.trim();
    if (!v) return;
    if (categories.some((c) => c.name === v)) {
      setNewCategoryValue("");
      return;
    }

    const type = newCategoryType;
    // Al confirmarse el alta, la lista se relee con los valores reales de la BD.
    const newValue: CategoryRow = {
      id: generateUuid(),
      name: v,
      type,
      monthly_budget: 0,
      color: null,
      icon: null,
    };

    // La categoría aparece y el campo se limpia al instante; el INSERT va en segundo plano.
    const revert = await addCategoryOptimistic(queryClient, newValue);
    setNewCategoryValue("");
    setNewCategoryType("expense");

    const creation = (async () => {
      let result: OperationResult = { ok: false, reason: "error" };
      try {
        result = await categoriesService.createCategory({ id: newValue.id, name: v, type });
      } catch (error) {
        console.error("Error creando categoría:", error);
      }

      if (result.ok) {
        await categoryCreatedConfirmed(queryClient);
        return true;
      }

      await revert();
      // Solo se restaura lo escrito si el campo sigue en su estado inicial: no se pisa
      // una categoría que ya se haya empezado a escribir.
      setNewCategoryValue((current) => (current === "" ? v : current));
      setNewCategoryType((current) => (current === "expense" ? type : current));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      const description = {
        duplicate: "Revisa que no exista otra con ese nombre.",
        offline: "Parece que no hay conexión a internet.",
        error: undefined,
      }[result.reason];
      toast.error("No se pudo crear la categoría", { description: description });
      return false;
    })();

    pendingCreations.current.set(newValue.id, creation);
    await creation;
    pendingCreations.current.delete(newValue.id);
  }

  function startRename(id: string, currentName: string) {
    setEditingCategory(id);
    setRenameValue(currentName);
    setConfirmDeleteCategory(null);
  }

  async function doRename(id: string) {
    const newValue = renameValue.trim();
    setEditingCategory(null);
    if (!newValue) return;

    // Si la categoría es recién creada, se espera a que termine su alta.
    const creation = pendingCreations.current.get(id);
    if (creation && !(await creation)) return;

    // El nombre cambia al instante (también en los movimientos cacheados); si la BD
    // rechaza el cambio, se revierte.
    const revert = await renameCategoryOptimistic(queryClient, id, newValue);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await categoriesService.updateCategory(id, { name: newValue });
    } catch (error) {
      console.error("Error actualizando categoría:", error);
    }

    if (result.ok) {
      await catalogRenamedConfirmed(queryClient);
      return;
    }

    await revert();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    const description = {
      duplicate: "Revisa que no exista otra con ese nombre.",
      offline: "Parece que no hay conexión a internet.",
      error: undefined,
    }[result.reason];
    toast.error("No se pudo renombrar la categoría", { description: description });
  }

  async function doDeleteCategory(id: string) {
    setConfirmDeleteCategory(null);

    // Si la categoría es recién creada, se espera a que termine su alta.
    const creation = pendingCreations.current.get(id);
    if (creation && !(await creation)) return;

    // La categoría desaparece al instante (sus movimientos quedan sin categoría, como hace
    // la BD); si la BD rechaza el borrado, reaparece.
    const revert = await removeCategoryOptimistic(queryClient, id);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await categoriesService.deleteCategory(id);
    } catch (error) {
      console.error("Error eliminando categoría:", error);
    }

    if (result.ok) {
      await categoryDeletedConfirmed(queryClient);
      return;
    }

    await revert();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar la categoría", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }

  return {
    categories,
    isLoading,
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
  };
}
