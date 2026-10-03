import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boxesService, type Medio } from "../services/boxes.service";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import {
  agregarMedioOptimista,
  catalogoRenombradoConfirmado,
  medioCreadoConfirmado,
  medioEliminadoConfirmado,
  mediosQuery,
  quitarMedioOptimista,
  renombrarMedioOptimista,
} from "@/lib/queries";
import { generarUuid } from "@/lib/utils";

const SIN_MEDIOS: Medio[] = [];

export function useBoxes() {
  const queryClient = useQueryClient();
  const mediosQ = useQuery(mediosQuery);
  const medios = mediosQ.data ?? SIN_MEDIOS;
  const isLoading = mediosQ.isPending;

  const [newMedioValue, setNewMedioValue] = useState("");
  const [editingMedio, setEditingMedio] = useState<string | null>(null); // id
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null); // id

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Renombrar o eliminar
  // una caja recién creada espera a su alta: si no, el UPDATE/DELETE llegaría antes que el
  // INSERT y no encontraría nada.
  const altasPendientes = useRef(new Map<string, Promise<boolean>>());

  // Crear de forma asíncrona
  async function handleAddMedio() {
    const v = newMedioValue.trim();
    if (!v) return;
    if (medios.some((m) => m.nombre === v)) {
      setNewMedioValue("");
      return; // Ya existe visualmente
    }

    // Al confirmarse el alta, la lista se relee con los valores reales de la BD.
    // El saldo de una caja nueva es 0.
    const nuevo: Medio = {
      id: generarUuid(),
      nombre: v,
      saldo: 0,
      color: null,
      icono: null,
    };

    // La caja aparece y el campo se limpia al instante; el INSERT va en segundo plano.
    const revertir = await agregarMedioOptimista(queryClient, nuevo);
    setNewMedioValue("");

    const alta = (async () => {
      let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
      try {
        resultado = await boxesService.crearMedio({ id: nuevo.id, nombre: v });
      } catch (error) {
        console.error("Error creando medio:", error);
      }

      if (resultado.ok) {
        await medioCreadoConfirmado(queryClient);
        return true;
      }

      await revertir();
      // Solo se restaura lo escrito si el campo sigue vacío: no se pisa una caja que ya se
      // haya empezado a escribir.
      setNewMedioValue((actual) => (actual === "" ? v : actual));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      const descripcion = {
        duplicado: "Revisa que no exista otra con ese nombre.",
        "sin-conexion": "Parece que no hay conexión a internet.",
        error: undefined,
      }[resultado.motivo];
      toast.error("No se pudo crear la caja", { description: descripcion });
      return false;
    })();

    altasPendientes.current.set(nuevo.id, alta);
    await alta;
    altasPendientes.current.delete(nuevo.id);
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

    // Si la caja es recién creada, se espera a que termine su alta.
    const alta = altasPendientes.current.get(id);
    if (alta && !(await alta)) return;

    // El nombre cambia al instante (también en los movimientos cacheados); si la BD
    // rechaza el cambio, se revierte.
    const revertir = await renombrarMedioOptimista(queryClient, id, nuevo);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await boxesService.actualizarMedio(id, { nombre: nuevo });
    } catch (error) {
      console.error("Error actualizando medio:", error);
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
    toast.error("No se pudo renombrar la caja", { description: descripcion });
  }

  // 4. Eliminar de forma asíncrona
  async function doDeleteMedio(id: string) {
    setConfirmDeleteMedio(null);

    // Si la caja es recién creada, se espera a que termine su alta.
    const alta = altasPendientes.current.get(id);
    if (alta && !(await alta)) return;

    // La caja y sus movimientos (la BD los borra en cascada) desaparecen al instante;
    // si la BD rechaza el borrado, reaparecen.
    const revertir = await quitarMedioOptimista(queryClient, id);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await boxesService.eliminarMedio(id);
    } catch (error) {
      console.error("Error eliminando medio:", error);
    }

    if (resultado.ok) {
      await medioEliminadoConfirmado(queryClient);
      return;
    }

    await revertir();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar la caja", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
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
