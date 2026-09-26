import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { boxesService, type Medio } from "../services/boxes.service";
import { catalogoModificado, mediosQuery, queryKeys } from "@/lib/queries";

const SIN_MEDIOS: Medio[] = [];

export function useBoxes() {
  const queryClient = useQueryClient();
  const mediosQ = useQuery(mediosQuery);
  const medios = mediosQ.data ?? SIN_MEDIOS;
  const isLoading = mediosQ.isPending;

  const setMedios = (fn: (prev: Medio[]) => Medio[]) =>
    queryClient.setQueryData<Medio[]>(queryKeys.medios, (old) => (old ? fn(old) : old));

  const [newMedioValue, setNewMedioValue] = useState("");
  const [editingMedio, setEditingMedio] = useState<string | null>(null); // id
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null); // id

  // Crear de forma asíncrona
  async function handleAddMedio() {
    const v = newMedioValue.trim();
    if (!v) return;
    if (medios.some((m) => m.nombre === v)) {
      setNewMedioValue("");
      return; // Ya existe visualmente
    }

    const nuevoMedio = await boxesService.crearMedio(v);

    if (nuevoMedio) {
      setMedios((prev) => [...prev, nuevoMedio]);
    }
    setNewMedioValue("");
  }

  function startRenameMedio(id: string, nombreActual: string) {
    setEditingMedio(id);
    setRenameMedioValue(nombreActual);
    setConfirmDeleteMedio(null);
  }

  // 3. Renombrar de forma asíncrona
  async function doRenameMedio(id: string) {
    const nuevo = renameMedioValue.trim();
    setEditingMedio(null);
    if (!nuevo) return;

    const exito = await boxesService.actualizarMedio(id, { nombre: nuevo });

    if (exito) {
      setMedios((prev) => prev.map((m) => (m.id === id ? { ...m, nombre: nuevo } : m)));
      await catalogoModificado(queryClient);
    }
  }

  // 4. Eliminar de forma asíncrona
  async function doDeleteMedio(id: string) {
    setConfirmDeleteMedio(null);

    const exito = await boxesService.eliminarMedio(id);

    if (exito) {
      setMedios((prev) => prev.filter((m) => m.id !== id));
      await catalogoModificado(queryClient);
    }
  }

  return {
    medios,
    isLoading,
    newMedioValue,
    setNewMedioValue,
    editingMedio,
    setEditingMedio,
    renameMedioValue,
    setRenameMedioValue,
    confirmDeleteMedio,
    setConfirmDeleteMedio,
    handleAddMedio,
    startRenameMedio,
    doRenameMedio,
    doDeleteMedio,
  };
}
