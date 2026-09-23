import { useState, useEffect } from "react";
import { categoriesService, type Categoria as CategoriaDB } from "../services/categories.service";

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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newCatValue, setNewCatValue] = useState("");
  const [newCatTipo, setNewCatTipo] = useState<"gasto" | "ingreso">("gasto");
  const [editingCat, setEditingCat] = useState<string | null>(null); // id
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null); // id

  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true);
      const data = await categoriesService.obtenerCategorias();
      setCategorias(data.map(mapCategoria));
      setIsLoading(false);
    }
    cargarDatos();
  }, []);

  async function handleAddCat() {
    const v = newCatValue.trim();
    if (!v) return;
    if (categorias.some((c) => c.name === v)) {
      setNewCatValue("");
      return;
    }

    const nueva = await categoriesService.crearCategoria(v, newCatTipo);
    if (nueva) {
      setCategorias([...categorias, mapCategoria(nueva)]);
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
      setCategorias(categorias.map((c) => (c.id === id ? { ...c, name: nuevo } : c)));
    }
  }

  async function doDeleteCat(id: string) {
    setConfirmDeleteCat(null);
    const exito = await categoriesService.eliminarCategoria(id);
    if (exito) {
      setCategorias(categorias.filter((c) => c.id !== id));
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
