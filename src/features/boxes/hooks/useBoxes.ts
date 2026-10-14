import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boxesService, type Medio } from "../services/boxes.service";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import {
  actualizarTasaMedioOptimista,
  agregarMedioOptimista,
  catalogoRenombradoConfirmado,
  medioCreadoConfirmado,
  medioEliminadoConfirmado,
  mediosQuery,
  quitarMedioOptimista,
  renombrarMedioOptimista,
  rendimientoMedioConfirmado,
} from "@/lib/queries";
import { parsearTasaEa, planearEdicionMedio } from "@/lib/rendimiento";
import { fechaLocalISO, generarUuid } from "@/lib/utils";

const SIN_MEDIOS: Medio[] = [];

export function useBoxes() {
  const queryClient = useQueryClient();
  const mediosQ = useQuery(mediosQuery);
  const medios = mediosQ.data ?? SIN_MEDIOS;
  const isLoading = mediosQ.isPending;

  const [newMedioValue, setNewMedioValue] = useState("");
  // Rendimiento E.A. de la caja que se está creando ("9,30"; vacío = sin rendimiento).
  const [newTasaValue, setNewTasaValue] = useState("");
  const [editingMedio, setEditingMedio] = useState<string | null>(null); // id
  const [renameMedioValue, setRenameMedioValue] = useState("");
  const [confirmDeleteMedio, setConfirmDeleteMedio] = useState<string | null>(null); // id
  const [confirmResetMedio, setConfirmResetMedio] = useState<string | null>(null); // id
  // Edición del rendimiento: tasa escrita ("9,30"; vacío = sin rendimiento) y desde qué día rinde.
  const [tasaValue, setTasaValue] = useState("");
  const [desdeValue, setDesdeValue] = useState(fechaLocalISO());

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
      setNewTasaValue("");
      return; // Ya existe visualmente
    }

    // Se valida antes de mostrar la caja: con una tasa inválida no se crea nada.
    const textoTasa = newTasaValue;
    const tasa = parsearTasaEa(textoTasa);
    if (tasa === undefined) {
      toast.error("El rendimiento debe ser un número entre 0 y 100", {
        description: "Usa hasta 3 decimales, por ejemplo 9,30.",
      });
      return; // se queda el formulario para corregirlo
    }

    // Al confirmarse el alta, la lista se relee con los valores reales de la BD.
    // El saldo de una caja nueva es 0.
    const nuevo: Medio = {
      id: generarUuid(),
      nombre: v,
      saldo: 0,
      color: null,
      icono: null,
      tasa_ea: tasa,
      // La BD lo fija al crear (hoy); se completa al releer la lista.
      rendimiento_desde: null,
    };

    // La caja aparece y los campos se limpian al instante; el INSERT va en segundo plano.
    const revertir = await agregarMedioOptimista(queryClient, nuevo);
    setNewMedioValue("");
    setNewTasaValue("");

    const alta = (async () => {
      let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
      try {
        resultado = await boxesService.crearMedio({ id: nuevo.id, nombre: v, tasaEa: tasa });
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
      setNewTasaValue((actual) => (actual === "" ? textoTasa : actual));
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

  function startEditMedio(medio: Medio) {
    setEditingMedio(medio.id);
    setRenameMedioValue(medio.nombre);
    setTasaValue(medio.tasa_ea === null ? "" : String(medio.tasa_ea).replace(".", ","));
    // Si ya rinde, se muestra desde cuándo; si no, el día de hoy por defecto.
    setDesdeValue(medio.rendimiento_desde ?? fechaLocalISO());
    setConfirmDeleteMedio(null);
  }

  // Guarda la tasa E.A. de la caja. La BD acredita el rendimiento cada noche; al activar la tasa
  // se piden ya los días atrasados desde la fecha elegida para no esperar hasta mañana.
  async function doChangeTasa(id: string, tasa: number | null, desde: string | null) {
    // Si la caja es recién creada, se espera a que termine su alta.
    const alta = altasPendientes.current.get(id);
    if (alta && !(await alta)) return;

    const revertir = await actualizarTasaMedioOptimista(queryClient, id, tasa);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await boxesService.actualizarMedio(id, {
        tasa_ea: tasa,
        ...(tasa !== null && desde ? { rendimiento_desde: desde } : {}),
      });
      // Es una comodidad: si falla, el job de la noche acredita igual lo pendiente.
      if (resultado.ok && tasa !== null) await boxesService.acreditarMisRendimientos();
    } catch (error) {
      console.error("Error actualizando la tasa del medio:", error);
    }

    if (resultado.ok) {
      await rendimientoMedioConfirmado(queryClient);
      return;
    }

    await revertir();
    toast.error("No se pudo guardar el rendimiento", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
  }

  // Quita de la caja los pesos acumulados por E.A. (historial y saldo); la tasa se conserva.
  async function doResetRendimientos(id: string) {
    setConfirmResetMedio(null);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await boxesService.reiniciarRendimientos(id);
    } catch (error) {
      console.error("Error reiniciando rendimientos:", error);
    }

    if (resultado.ok) {
      // El saldo lo recalcula la BD: no se puede deducir aquí, hay que volver a leerlo.
      await rendimientoMedioConfirmado(queryClient);
      return;
    }

    toast.error("No se pudieron reiniciar los rendimientos", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
  }

  // Confirma la edición: cambia solo lo que el usuario modificó (nombre y/o rendimiento).
  async function doSaveMedio(id: string) {
    const medio = medios.find((m) => m.id === id);
    const tasa = parsearTasaEa(tasaValue);
    if (!medio) return;
    if (tasa === undefined) {
      toast.error("El rendimiento debe ser un número entre 0 y 100", {
        description: "Usa hasta 3 decimales, por ejemplo 9,30.",
      });
      return; // se queda en edición para corregirlo
    }

    const plan = planearEdicionMedio(medio, renameMedioValue, tasa, desdeValue);

    setEditingMedio(null);
    if (plan.tasaCambio || plan.desdeCambio) {
      await doChangeTasa(id, tasa, plan.activando || plan.desdeCambio ? desdeValue : null);
    }
    if (plan.nombreCambio) await doRenameMedio(id);
  }

  // 3. Renombrar de forma asíncrona
  async function doRenameMedio(id: string) {
    const nuevo = renameMedioValue.trim();
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
    newTasaValue,
    setNewTasaValue,
    editingMedio,
    setEditingMedio,
    renameMedioValue,
    setRenameMedioValue,
    confirmDeleteMedio,
    setConfirmDeleteMedio,
    confirmResetMedio,
    setConfirmResetMedio,
    doResetRendimientos,
    tasaValue,
    setTasaValue,
    desdeValue,
    setDesdeValue,
    handleAddMedio,
    startEditMedio,
    doSaveMedio,
    doDeleteMedio,
  };
}
