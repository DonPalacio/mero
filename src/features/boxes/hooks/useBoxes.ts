import { useState } from "react";

export interface Medio {
  name: string;
}

export function useBoxes() {
  const [medios, setMedios] = useState<Medio[]>([
    { name: "Efectivo" },
    { name: "Nu" },
    { name: "Bancolombia" },
  ]);

  const [newMedioValue, setNewMedioValue] = useState("");
  const [editingMedio, setEditingMedio] = useState<string | null>(null);
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null);

  function handleAddMedio() {
    const v = newMedioValue.trim();
    if (!v) return;
    if (medios.some((m) => m.name === v)) {
      setNewMedioValue("");
      return;
    }
    setMedios([...medios, { name: v }]);
    setNewMedioValue("");
  }

  function startRenameMedio(name: string) {
    setEditingMedio(name);
    setRenameMedioValue(name);
    setConfirmDeleteMedio(null);
  }

  function doRenameMedio(oldName: string) {
    const nuevo = renameMedioValue.trim();
    setEditingMedio(null);
    if (!nuevo || nuevo === oldName) return;

    setMedios(medios.map((m) => (m.name === oldName ? { ...m, name: nuevo } : m)));
  }

  function doDeleteMedio(name: string) {
    setConfirmDeleteMedio(null);
    setMedios(medios.filter((m) => m.name !== name));
  }

  return {
    medios,
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
