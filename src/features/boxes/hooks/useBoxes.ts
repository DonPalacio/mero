import { useState, useEffect } from "react";
import { boxesService, type Medio, type TipoMedio } from "../services/boxes.service";

export function useBoxes() {
  const [medios, setMedios] = useState<Medio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newMedioValue, setNewMedioValue] = useState("");
  const [newMedioTipo, setNewMedioTipo] = useState<TipoMedio>("efectivo");
  const [editingMedio, setEditingMedio] = useState<string | null>(null); // id
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null); // id

  // 1. Cargar los datos reales al entrar a la pantalla
  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true);
      const data = await boxesService.obtenerMedios();
      setMedios(data);
      setIsLoading(false);
    }
    cargarDatos();
  }, []);

  // 2. Crear de forma asíncrona
  async function handleAddMedio() {
    const v = newMedioValue.trim();
    if (!v) return;
    if (medios.some((m) => m.nombre === v)) {
      setNewMedioValue("");
      return; // Ya existe visualmente
    }

    const nuevoMedio = await boxesService.crearMedio(v, newMedioTipo);

    if (nuevoMedio) {
      setMedios([...medios, nuevoMedio]);
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
      setMedios(medios.map((m) => (m.id === id ? { ...m, nombre: nuevo } : m)));
    }
  }

  // 4. Eliminar de forma asíncrona
  async function doDeleteMedio(id: string) {
    setConfirmDeleteMedio(null);

    const exito = await boxesService.eliminarMedio(id);

    if (exito) {
      setMedios(medios.filter((m) => m.id !== id));
    }
  }

  return {
    medios,
    isLoading,
    newMedioValue,
    setNewMedioValue,
    newMedioTipo,
    setNewMedioTipo,
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
