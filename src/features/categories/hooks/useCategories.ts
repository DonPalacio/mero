import { useState } from "react";

export interface Categoria {
  name: string;
  tipo: "gasto" | "ingreso";
  budget: number;
}

export function useCategories() {
  // DATOS MOCK TEMPORALES PARA VISUALIZACIÓN LO MÁS FIEL POSIBLE A LA REALIDAD
  const [categorias, setCategorias] = useState<Categoria[]>([
    { name: "Salario", tipo: "ingreso", budget: 0 },
    { name: "Suscripciones", tipo: "gasto", budget: 150000 },
    { name: "Transporte y Mantenimiento", tipo: "gasto", budget: 250000 },
  ]);

  const [newCatValue, setNewCatValue] = useState("");
  const [newCatTipo, setNewCatTipo] = useState<"gasto" | "ingreso">("gasto");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  function handleAddCat() {
    const v = newCatValue.trim();
    if (!v) return;
    if (categorias.some((c) => c.name === v)) {
      setNewCatValue("");
      return;
    }
    setCategorias([...categorias, { name: v, tipo: newCatTipo, budget: 0 }]);
    setNewCatValue("");
    setNewCatTipo("gasto");
  }

  function startRename(name: string) {
    setEditingCat(name);
    setRenameValue(name);
    setConfirmDeleteCat(null);
  }

  function doRename(oldName: string) {
    const nuevo = renameValue.trim();
    setEditingCat(null);
    if (!nuevo || nuevo === oldName) return;

    setCategorias(categorias.map((c) => (c.name === oldName ? { ...c, name: nuevo } : c)));
  }

  function doDeleteCat(name: string) {
    setConfirmDeleteCat(null);
    setCategorias(categorias.filter((c) => c.name !== name));
  }

  return {
    categorias,
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
