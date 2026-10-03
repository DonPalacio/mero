import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoriesService, type Categoria as CategoriaDB } from "../services/categories.service";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import {
  agregarCategoriaOptimista,
  catalogoRenombradoConfirmado,
  categoriaCreadaConfirmada,
  categoriaEliminadaConfirmada,
  categoriasQuery,
  quitarCategoriaOptimista,
  renombrarCategoriaOptimista,
} from "@/lib/queries";
import { generarUuid } from "@/lib/utils";

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

  const [newCatValue, setNewCatValue] = useState("");
  const [newCatTipo, setNewCatTipo] = useState<"gasto" | "ingreso">("gasto");
  const [editingCat, setEditingCat] = useState<string | null>(null); // id
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null); // id

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Renombrar o eliminar
  // una categoría recién creada espera a su alta: si no, el UPDATE/DELETE llegaría antes que el
  // INSERT y no encontraría nada.
  const altasPendientes = useRef(new Map<string, Promise<boolean>>());

  async function handleAddCat() {
    const v = newCatValue.trim();
    if (!v) return;
    if (categorias.some((c) => c.name === v)) {
      setNewCatValue("");
      return;
    }

    const tipo = newCatTipo;
    // Al confirmarse el alta, la lista se relee con los valores reales de la BD.
    const nueva: CategoriaDB = {
      id: generarUuid(),
      nombre: v,
      tipo,
      presupuesto_mensual: 0,
      color: null,
      icono: null,
    };

    // La categoría aparece y el campo se limpia al instante; el INSERT va en segundo plano.
    const revertir = await agregarCategoriaOptimista(queryClient, nueva);
    setNewCatValue("");
    setNewCatTipo("gasto");

    const alta = (async () => {
      let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
      try {
        resultado = await categoriesService.crearCategoria({ id: nueva.id, nombre: v, tipo });
      } catch (error) {
        console.error("Error creando categoría:", error);
      }

      if (resultado.ok) {
        await categoriaCreadaConfirmada(queryClient);
        return true;
      }

      await revertir();
      // Solo se restaura lo escrito si el campo sigue en su estado inicial: no se pisa
      // una categoría que ya se haya empezado a escribir.
      setNewCatValue((actual) => (actual === "" ? v : actual));
      setNewCatTipo((actual) => (actual === "gasto" ? tipo : actual));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      const descripcion = {
        duplicado: "Revisa que no exista otra con ese nombre.",
        "sin-conexion": "Parece que no hay conexión a internet.",
        error: undefined,
      }[resultado.motivo];
      toast.error("No se pudo crear la categoría", { description: descripcion });
      return false;
    })();

    altasPendientes.current.set(nueva.id, alta);
    await alta;
    altasPendientes.current.delete(nueva.id);
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

    // Si la categoría es recién creada, se espera a que termine su alta.
    const alta = altasPendientes.current.get(id);
    if (alta && !(await alta)) return;

    // El nombre cambia al instante (también en los movimientos cacheados); si la BD
    // rechaza el cambio, se revierte.
    const revertir = await renombrarCategoriaOptimista(queryClient, id, nuevo);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await categoriesService.actualizarCategoria(id, { nombre: nuevo });
    } catch (error) {
      console.error("Error actualizando categoría:", error);
    }

    if (resultado.ok) {
      await catalogoRenombradoConfirmado(queryClient);
      return;
    }

    await revertir();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    const descripcion = {
      duplicado: "Revisa que no exista otra con ese nombre.",
      "sin-conexion": "Parece que no hay conexión a internet.",
      error: undefined,
    }[resultado.motivo];
    toast.error("No se pudo renombrar la categoría", { description: descripcion });
  }

  async function doDeleteCat(id: string) {
    setConfirmDeleteCat(null);

    // Si la categoría es recién creada, se espera a que termine su alta.
    const alta = altasPendientes.current.get(id);
    if (alta && !(await alta)) return;

    // La categoría desaparece al instante (sus movimientos quedan sin categoría, como hace
    // la BD); si la BD rechaza el borrado, reaparece.
    const revertir = await quitarCategoriaOptimista(queryClient, id);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await categoriesService.eliminarCategoria(id);
    } catch (error) {
      console.error("Error eliminando categoría:", error);
    }

    if (resultado.ok) {
      await categoriaEliminadaConfirmada(queryClient);
      return;
    }

    await revertir();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar la categoría", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
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
