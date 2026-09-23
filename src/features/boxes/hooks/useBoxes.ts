import { useState, useEffect } from "react";
import { boxesService } from "../services/boxes.service";

export interface Medio {
  id?: string | number; // Agregamos id opcional por si Supabase lo devuelve
  name: string;
}

export function useBoxes() {
  const [medios, setMedios] = useState<Medio[]>([]);
  const [isLoading, setIsLoading] = useState(true); // <-- Nuevo estado para saber si está cargando

  const [newMedioValue, setNewMedioValue] = useState("");
  const [editingMedio, setEditingMedio] = useState<string | null>(null);
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null);

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
    if (medios.some((m) => m.name === v)) {
      setNewMedioValue("");
      return; // Ya existe visualmente
    }

    // Guardamos en la base de datos real
    const nuevoMedio = await boxesService.crearMedio(v);

    // Solo si Supabase lo creó con éxito, lo agregamos a la pantalla
    if (nuevoMedio) {
      setMedios([...medios, nuevoMedio]);
    }
    setNewMedioValue("");
  }

  function startRenameMedio(name: string) {
    setEditingMedio(name);
    setRenameMedioValue(name);
    setConfirmDeleteMedio(null);
  }

  // 3. Renombrar de forma asíncrona
  async function doRenameMedio(oldName: string) {
    const nuevo = renameMedioValue.trim();
    setEditingMedio(null);
    if (!nuevo || nuevo === oldName) return;

    // Actualizamos en la base de datos real
    const exito = await boxesService.actualizarMedio(oldName, nuevo);

    if (exito) {
      setMedios(medios.map((m) => (m.name === oldName ? { ...m, name: nuevo } : m)));
    }
  }

  // 4. Eliminar de forma asíncrona
  async function doDeleteMedio(name: string) {
    setConfirmDeleteMedio(null);

    // Eliminamos en la base de datos real
    const exito = await boxesService.eliminarMedio(name);

    if (exito) {
      setMedios(medios.filter((m) => m.name !== name));
    }
  }

  return {
    medios,
    isLoading, // Exportamos esto por si quieres poner un "Cargando..." en tu vista de Cajas
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
