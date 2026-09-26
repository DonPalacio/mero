import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesService, type Categoria as CategoriaDB } from "../services/categories.service";
import { catalogoModificado, categoriasQuery, queryKeys } from "@/lib/queries";

export interface Categoria {
  id: string;
  name: string;
  tipo: "gasto" | "ingreso";
  budget: number;
}

function mapCategoria(c: CategoriaDB): Categoria {
  return {
    id: c.id,
    name: c.nombre,
    tipo: c.tipo,
    budget: Number(c.presupuesto_mensual),
  };
}

export function useCategories() {
  const queryClient = useQueryClient();
  const categoriasQ = useQuery(categoriasQuery);
  const categorias = useMemo(() => (categoriasQ.data ?? []).map(mapCategoria), [categoriasQ.data]);
  const isLoading = categoriasQ.isPending;

  const setCategorias = (fn: (prev: CategoriaDB[]) => CategoriaDB[]) =>
    queryClient.setQueryData<CategoriaDB[]>(queryKeys.categorias, (old) => (old ? fn(old) : old));

  const [newCatValue, setNewCatValue] = useState("");
  const [newCatTipo, setNewCatTipo] = useState<"gasto" | "ingreso">("gasto");
  const [editingCat, setEditingCat] = useState<string | null>(null); // id
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null); // id

  async function handleAddCat() {
    const v = newCatValue.trim();
    if (!v) return;
    if (categorias.some((c) => c.name === v)) {
      setNewCatValue("");
      return;
    }

    const nueva = await categoriesService.crearCategoria(v, newCatTipo);
    if (nueva) {
      setCategorias((prev) => [...prev, nueva]);
    }
    setNewCatValue("");
    setNewCatTipo("gasto");
  }

  function startRename(id: string, nombreActual: string) {
    setEditingCat(id);
    setRenameValue(nombreActual);
    setConfirmDeleteCat(null);
  }

  async function doRename(id: string) {
    const nuevo = renameValue.trim();
    setEditingCat(null);
    if (!nuevo) return;

    const exito = await categoriesService.actualizarCategoria(id, { nombre: nuevo });
    if (exito) {
      setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, nombre: nuevo } : c)));
      await catalogoModificado(queryClient);
    }
  }

  async function doDeleteCat(id: string) {
    setConfirmDeleteCat(null);
    const exito = await categoriesService.eliminarCategoria(id);
    if (exito) {
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      await catalogoModificado(queryClient);
    }
  }

  return {
    categorias,
    isLoading,
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
  };
}
