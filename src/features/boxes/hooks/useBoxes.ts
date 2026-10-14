import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boxesService, type Box } from "../services/boxes.service";
import type { OperationResult } from "@/lib/supabase-errors";
import {
  updateBoxEaRateOptimistic,
  addBoxOptimistic,
  catalogRenamedConfirmed,
  boxCreatedConfirmed,
  boxDeletedConfirmed,
  boxesQuery,
  removeBoxOptimistic,
  renameBoxOptimistic,
  boxYieldConfirmed,
} from "@/lib/queries";
import { parseEaRate, planBoxEdit } from "@/lib/yield";
import { localISODate, generateUuid } from "@/lib/utils";

const NO_BOXES: Box[] = [];

export function useBoxes() {
  const queryClient = useQueryClient();
  const boxesQ = useQuery(boxesQuery);
  const boxes = boxesQ.data ?? NO_BOXES;
  const isLoading = boxesQ.isPending;

  const [newBoxValue, setNewBoxValue] = useState("");
  // Rendimiento E.A. de la caja que se está creando ("9,30"; vacío = sin rendimiento).
  const [newEaRateValue, setNewEaRateValue] = useState("");
  const [editingBox, setEditingBox] = useState<string | null>(null); // id
  const [renameBoxValue, setRenameBoxValue] = useState("");
  const [confirmDeleteBox, setConfirmDeleteBox] = useState<string | null>(null); // id
  const [confirmResetBox, setConfirmResetBox] = useState<string | null>(null); // id
  // Edición del rendimiento: tasa escrita ("9,30"; vacío = sin rendimiento) y desde qué día rinde.
  const [eaRateValue, setEaRateValue] = useState("");
  const [fromValue, setFromValue] = useState(localISODate());

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Renombrar o eliminar
  // una caja recién creada espera a su alta: si no, el UPDATE/DELETE llegaría antes que el
  // INSERT y no encontraría nada.
  const pendingCreations = useRef(new Map<string, Promise<boolean>>());

  // Crear de forma asíncrona
  async function handleAddBox() {
    const v = newBoxValue.trim();
    if (!v) return;
    if (boxes.some((m) => m.name === v)) {
      setNewBoxValue("");
      setNewEaRateValue("");
      return; // Ya existe visualmente
    }

    // Se valida antes de mostrar la caja: con una tasa inválida no se crea nada.
    const rateText = newEaRateValue;
    const rate = parseEaRate(rateText);
    if (rate === undefined) {
      toast.error("El rendimiento debe ser un número entre 0 y 100", {
        description: "Usa hasta 3 decimales, por ejemplo 9,30.",
      });
      return; // se queda el formulario para corregirlo
    }

    // Al confirmarse el alta, la lista se relee con los valores reales de la BD.
    // El saldo de una caja nueva es 0.
    const newValue: Box = {
      id: generateUuid(),
      name: v,
      balance: 0,
      color: null,
      icon: null,
      ea_rate: rate,
      // La BD lo fija al crear (hoy); se completa al releer la lista.
      yield_from: null,
    };

    // La caja aparece y los campos se limpian al instante; el INSERT va en segundo plano.
    const revert = await addBoxOptimistic(queryClient, newValue);
    setNewBoxValue("");
    setNewEaRateValue("");

    const creation = (async () => {
      let result: OperationResult = { ok: false, reason: "error" };
      try {
        result = await boxesService.createBox({ id: newValue.id, name: v, eaRate: rate });
      } catch (error) {
        console.error("Error creando medio:", error);
      }

      if (result.ok) {
        await boxCreatedConfirmed(queryClient);
        return true;
      }

      await revert();
      // Solo se restaura lo escrito si el campo sigue vacío: no se pisa una caja que ya se
      // haya empezado a escribir.
      setNewBoxValue((current) => (current === "" ? v : current));
      setNewEaRateValue((current) => (current === "" ? rateText : current));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      const description = {
        duplicate: "Revisa que no exista otra con ese nombre.",
        offline: "Parece que no hay conexión a internet.",
        error: undefined,
      }[result.reason];
      toast.error("No se pudo crear la caja", { description: description });
      return false;
    })();

    pendingCreations.current.set(newValue.id, creation);
    await creation;
    pendingCreations.current.delete(newValue.id);
  }

  function startEditBox(box: Box) {
    setEditingBox(box.id);
    setRenameBoxValue(box.name);
    setEaRateValue(box.ea_rate === null ? "" : String(box.ea_rate).replace(".", ","));
    // Si ya rinde, se muestra desde cuándo; si no, el día de hoy por defecto.
    setFromValue(box.yield_from ?? localISODate());
    setConfirmDeleteBox(null);
  }

  // Guarda la tasa E.A. de la caja. La BD acredita el rendimiento cada noche; al activar la tasa
  // se piden ya los días atrasados desde la fecha elegida para no esperar hasta mañana.
  async function doChangeEaRate(id: string, rate: number | null, fromDate: string | null) {
    // Si la caja es recién creada, se espera a que termine su alta.
    const creation = pendingCreations.current.get(id);
    if (creation && !(await creation)) return;

    const revert = await updateBoxEaRateOptimistic(queryClient, id, rate);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await boxesService.updateBox(id, {
        ea_rate: rate,
        ...(rate !== null && fromDate ? { yield_from: fromDate } : {}),
      });
      // Es una comodidad: si falla, el job de la noche acredita igual lo pendiente.
      if (result.ok && rate !== null) await boxesService.creditMyYields();
    } catch (error) {
      console.error("Error actualizando la tasa del medio:", error);
    }

    if (result.ok) {
      await boxYieldConfirmed(queryClient);
      return;
    }

    await revert();
    toast.error("No se pudo guardar el rendimiento", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }

  // Quita de la caja los pesos acumulados por E.A. (historial y saldo); la tasa se conserva.
  async function doResetYields(id: string) {
    setConfirmResetBox(null);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await boxesService.resetYields(id);
    } catch (error) {
      console.error("Error reiniciando rendimientos:", error);
    }

    if (result.ok) {
      // El saldo lo recalcula la BD: no se puede deducir aquí, hay que volver a leerlo.
      await boxYieldConfirmed(queryClient);
      return;
    }

    toast.error("No se pudieron reiniciar los rendimientos", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }

  // Confirma la edición: cambia solo lo que el usuario modificó (nombre y/o rendimiento).
  async function doSaveBox(id: string) {
    const box = boxes.find((m) => m.id === id);
    const rate = parseEaRate(eaRateValue);
    if (!box) return;
    if (rate === undefined) {
      toast.error("El rendimiento debe ser un número entre 0 y 100", {
        description: "Usa hasta 3 decimales, por ejemplo 9,30.",
      });
      return; // se queda en edición para corregirlo
    }

    const plan = planBoxEdit(box, renameBoxValue, rate, fromValue);

    setEditingBox(null);
    if (plan.rateChanged || plan.fromChanged) {
      await doChangeEaRate(id, rate, plan.activating || plan.fromChanged ? fromValue : null);
    }
    if (plan.nameChanged) await doRenameBox(id);
  }

  // 3. Renombrar de forma asíncrona
  async function doRenameBox(id: string) {
    const newValue = renameBoxValue.trim();
    if (!newValue) return;

    // Si la caja es recién creada, se espera a que termine su alta.
    const creation = pendingCreations.current.get(id);
    if (creation && !(await creation)) return;

    // El nombre cambia al instante (también en los movimientos cacheados); si la BD
    // rechaza el cambio, se revierte.
    const revert = await renameBoxOptimistic(queryClient, id, newValue);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await boxesService.updateBox(id, { name: newValue });
    } catch (error) {
      console.error("Error actualizando medio:", error);
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
    toast.error("No se pudo renombrar la caja", { description: description });
  }

  // 4. Eliminar de forma asíncrona
  async function doDeleteBox(id: string) {
    setConfirmDeleteBox(null);

    // Si la caja es recién creada, se espera a que termine su alta.
    const creation = pendingCreations.current.get(id);
    if (creation && !(await creation)) return;

    // La caja y sus movimientos (la BD los borra en cascada) desaparecen al instante;
    // si la BD rechaza el borrado, reaparecen.
    const revert = await removeBoxOptimistic(queryClient, id);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await boxesService.deleteBox(id);
    } catch (error) {
      console.error("Error eliminando medio:", error);
    }

    if (result.ok) {
      await boxDeletedConfirmed(queryClient);
      return;
    }

    await revert();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar la caja", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }

  return {
    boxes,
    isLoading,
    newBoxValue,
    setNewBoxValue,
    newEaRateValue,
    setNewEaRateValue,
    editingBox,
    setEditingBox,
    renameBoxValue,
    setRenameBoxValue,
    confirmDeleteBox,
    setConfirmDeleteBox,
    confirmResetBox,
    setConfirmResetBox,
    doResetYields,
    eaRateValue,
    setEaRateValue,
    fromValue,
    setFromValue,
    handleAddBox,
    startEditBox,
    doSaveBox,
    doDeleteBox,
  };
}
