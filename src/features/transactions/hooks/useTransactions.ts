import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transactions.service";
import {
  agregarMovimientoOptimista,
  categoriasQuery,
  mediosQuery,
  movimientoCreadoConfirmado,
  movimientoEliminadoConfirmado,
  mesesConMovimientosQuery,
  movimientosMesQuery,
  quitarMovimientoOptimista,
} from "@/lib/queries";
import { toast } from "sonner";
import type { ResultadoOperacion } from "@/lib/supabase-errors";
import { fechaLocalISO, generarUuid } from "@/lib/utils";

// Reenvía el gesto de scroll horizontal desde cualquier punto de una fila
// del historial (ícono, monto, botón de eliminar) hacia la franja de texto
// de esa fila (data-mov-scroll), que es la única que realmente se desplaza.
// Así el scroll-x "se siente" disponible en todo el registro sin mover el
// ícono, el monto ni el botón, y sin tocar el diseño de Transactions.tsx.
function encontrarScrollDeLaFila(
  target: EventTarget | null,
  // El mouse no tiene equivalente nativo a "arrastrar para desplazar" (a
  // diferencia del touch), así que para clic-y-arrastrar sí debe activarse
  // aunque el gesto empiece encima del propio texto.
  { permitirDentroDelTexto = false } = {},
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const fila = target.closest("[data-mov-row]");
  const scrollEl = fila?.querySelector<HTMLElement>("[data-mov-scroll]") ?? null;
  if (!scrollEl) return null;
  if (!permitirDentroDelTexto && scrollEl.contains(target)) return null; // ya lo maneja el navegador
  if (scrollEl.scrollWidth <= scrollEl.clientWidth) return null; // nada que desplazar
  return scrollEl;
}

function useReenvioScrollHorizontalPorFila() {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const lista = listRef.current;
    if (!lista) return;

    function onWheel(e: WheelEvent) {
      // Solo gestos horizontales explícitos (trackpad o Shift+rueda); una
      // rueda vertical normal debe seguir moviendo la lista, no la fila.
      const delta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (delta === 0) return;
      const scrollEl = encontrarScrollDeLaFila(e.target);
      if (!scrollEl) return;
      scrollEl.scrollLeft += delta;
      e.preventDefault();
    }

    const touch: {
      scrollEl: HTMLElement | null;
      x: number;
      y: number;
      lastX: number;
      locked: "x" | "y" | null;
    } = { scrollEl: null, x: 0, y: 0, lastX: 0, locked: null };

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      touch.scrollEl = encontrarScrollDeLaFila(e.target);
      touch.x = touch.lastX = t.clientX;
      touch.y = t.clientY;
      touch.locked = null;
    }

    function onTouchMove(e: TouchEvent) {
      if (!touch.scrollEl) return;
      const t = e.touches[0];
      if (!t) return;

      if (!touch.locked) {
        const dx = t.clientX - touch.x;
        const dy = t.clientY - touch.y;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // aún no hay gesto claro
        touch.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (touch.locked === "y") {
          touch.scrollEl = null; // deja que la lista siga con su scroll vertical de siempre
          return;
        }
      }

      touch.scrollEl.scrollLeft -= t.clientX - touch.lastX;
      touch.lastX = t.clientX;
      e.preventDefault();
    }

    function onTouchEnd() {
      touch.scrollEl = null;
      touch.locked = null;
    }

    // Clic y arrastrar con mouse: a diferencia del touch, el navegador no
    // ofrece esto de forma nativa para un overflow-x-auto, así que hay que
    // construirlo. No necesita el "lock" x/y del touch: el scroll vertical
    // por mouse va siempre por la rueda, nunca por arrastre.
    const mouse: {
      scrollEl: HTMLElement | null;
      startX: number;
      startScrollLeft: number;
      dragging: boolean;
    } = {
      scrollEl: null,
      startX: 0,
      startScrollLeft: 0,
      dragging: false,
    };

    function cancelarClicSiguiente(e: MouseEvent) {
      // Evita que el mismo gesto de arrastre dispare un clic al soltar
      // (por ejemplo, sobre el botón Eliminar).
      e.stopPropagation();
    }

    function onMouseMove(e: MouseEvent) {
      if (!mouse.scrollEl) return;
      const dx = e.clientX - mouse.startX;
      if (!mouse.dragging) {
        if (Math.abs(dx) < 4) return; // aún puede ser un clic normal
        mouse.dragging = true;
      }
      mouse.scrollEl.scrollLeft = mouse.startScrollLeft - dx;
      e.preventDefault(); // evita seleccionar el texto mientras se arrastra
    }

    function onMouseUp() {
      if (mouse.dragging) {
        document.addEventListener("click", cancelarClicSiguiente, { capture: true, once: true });
      }
      mouse.scrollEl = null;
      mouse.dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // solo clic principal
      const scrollEl = encontrarScrollDeLaFila(e.target, { permitirDentroDelTexto: true });
      if (!scrollEl) return;
      mouse.scrollEl = scrollEl;
      mouse.startX = e.clientX;
      mouse.startScrollLeft = scrollEl.scrollLeft;
      mouse.dragging = false;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    // passive:false es necesario para poder cancelar el scroll vertical de la
    // página mientras se arrastra horizontalmente dentro de una fila.
    lista.addEventListener("wheel", onWheel, { passive: false });
    lista.addEventListener("touchstart", onTouchStart, { passive: true });
    lista.addEventListener("touchmove", onTouchMove, { passive: false });
    lista.addEventListener("touchend", onTouchEnd);
    lista.addEventListener("touchcancel", onTouchEnd);
    lista.addEventListener("mousedown", onMouseDown);

    return () => {
      lista.removeEventListener("wheel", onWheel);
      lista.removeEventListener("touchstart", onTouchStart);
      lista.removeEventListener("touchmove", onTouchMove);
      lista.removeEventListener("touchend", onTouchEnd);
      lista.removeEventListener("touchcancel", onTouchEnd);
      lista.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("click", cancelarClicSiguiente, { capture: true });
    };
  }, []);

  return listRef;
}

export interface CategoriaBase {
  name: string;
  tipo: "gasto" | "ingreso";
}

export interface Movimiento {
  id: string;
  tipo: "gasto" | "ingreso";
  monto: number;
  cajita: string;
  medio: string;
  fecha: string;
  nota: string;
}

const SIN_MOVIMIENTOS: Movimiento[] = [];

// Ventana de historial (en meses, hacia atrás desde el actual) en la que se buscan
// los meses con movimientos para el selector. No se muestra: solo acota la búsqueda.
const MESES_DE_HISTORIAL = 24;

export function useTransactions() {
  const listRef = useReenvioScrollHorizontalPorFila();

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActual);

  const queryClient = useQueryClient();
  // Solo se pide el mes que se está viendo; cada mes se cachea por separado.
  const movimientosQ = useQuery(movimientosMesQuery(selectedMonth));
  const mediosQ = useQuery(mediosQuery);
  const categoriasQ = useQuery(categoriasQuery);

  // Primer día de la ventana de historial: desde ahí se buscan los meses con movimientos.
  const [anioActual = 0, numMesActual = 1] = mesActual.split("-").map(Number);
  const inicioVentana = new Date(anioActual, numMesActual - MESES_DE_HISTORIAL, 1);
  const desde = `${inicioVentana.getFullYear()}-${String(inicioVentana.getMonth() + 1).padStart(2, "0")}-01`;
  const mesesQ = useQuery(mesesConMovimientosQuery(desde));

  const movimientos = movimientosQ.data ?? SIN_MOVIMIENTOS;
  const isLoading = movimientosQ.isPending || mediosQ.isPending || categoriasQ.isPending;

  // Precarga el mes anterior y el siguiente (sin pasar del actual) para que al cambiar
  // de mes la lista ya esté en caché. prefetchQuery respeta el staleTime y no lanza errores.
  useEffect(() => {
    const [anio = 0, numMes = 1] = selectedMonth.split("-").map(Number);
    [new Date(anio, numMes - 2, 1), new Date(anio, numMes, 1)]
      .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
      .filter((mes) => mes <= mesActual)
      .forEach((mes) => queryClient.prefetchQuery(movimientosMesQuery(mes)));
  }, [selectedMonth, mesActual, queryClient]);

  // Los selectores se muestran ordenados por nombre
  const mediosData = useMemo(
    () => [...(mediosQ.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [mediosQ.data],
  );
  const categoriasData = useMemo(
    () => [...(categoriasQ.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categoriasQ.data],
  );

  const [tipoSel, setTipoSel] = useState<"gasto" | "ingreso">("gasto");
  const [monto, setMonto] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedMedio, setSelectedMedio] = useState<string | null>(null);
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [nota, setNota] = useState("");
  const [fMsg, setFMsg] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  // Si la pantalla sigue abierta al pasar la medianoche (hora local), el campo fecha avanza
  // al nuevo día, pero solo si seguía en "hoy": una fecha elegida a mano no se toca.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function programar() {
      const ahora = new Date();
      const hoyAlProgramar = fechaLocalISO(ahora);
      const medianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
      timer = setTimeout(() => {
        const nuevoHoy = fechaLocalISO();
        setFecha((actual) => (actual === hoyAlProgramar ? nuevoHoy : actual));
        programar();
      }, medianoche.getTime() - ahora.getTime());
    }

    programar();
    return () => clearTimeout(timer);
  }, []);

  const mediosDisponibles = mediosData.map((m) => m.nombre);
  const categoriasDisponibles: CategoriaBase[] = categoriasData.map((c) => ({
    name: c.nombre,
    tipo: c.tipo,
  }));

  const categoriasFiltradas = categoriasDisponibles.filter((c) => c.tipo === tipoSel);

  // Meses disponibles para filtrar la tabla: los que tengan movimientos (dentro de la
  // ventana de MESES_DE_HISTORIAL) + el mes actual y el seleccionado siempre presentes.
  const monthOptions = useMemo(() => {
    const meses = new Set<string>([...(mesesQ.data ?? []), mesActual, selectedMonth]);

    return Array.from(meses)
      .sort((a, b) => b.localeCompare(a)) // más reciente primero
      .map((m) => {
        const [year = 0, month = 1] = m.split("-").map(Number);
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [mesesQ.data, mesActual, selectedMonth]);

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Lo usa handleDelete.
  const insertsPendientes = useRef(new Map<string, Promise<boolean>>());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = parseFloat(monto);

    if (!montoNum || montoNum <= 0) {
      setFMsg("Ingresa un monto válido mayor a 0");
      return;
    }
    if (!selectedMedio) {
      setFMsg("Selecciona un medio (Box)");
      return;
    }
    // El campo de fecha se puede vaciar en el navegador.
    if (!fecha) {
      setFMsg("Selecciona una fecha");
      return;
    }

    // La categoría es opcional: sin ella, el movimiento no se contabiliza
    // en los totales del dashboard (sirve para traspasos entre medios).
    const categoriaObj = selectedCat
      ? categoriasData.find((c) => c.nombre === selectedCat)
      : undefined;
    const medioObj = mediosData.find((m) => m.nombre === selectedMedio);

    // Una selección que ya no existe (se borró o renombró en otra pantalla) se descarta:
    // sin esto, una categoría inexistente se guardaría como "sin categoría" sin avisar.
    if (!medioObj) {
      setSelectedMedio(null);
      setFMsg("Medio inválido");
      return;
    }
    if (selectedCat && !categoriaObj) {
      setSelectedCat(null);
      setFMsg("Categoría inválida");
      return;
    }

    setFMsg("");

    const id = generarUuid();
    const nuevoMov: Movimiento = {
      id,
      tipo: tipoSel,
      monto: montoNum,
      cajita: selectedCat ?? "",
      medio: selectedMedio,
      fecha,
      nota,
    };
    // Lo escrito, para devolverlo al formulario si la BD rechaza el movimiento.
    const escrito = { monto, nota, categoria: selectedCat };

    // La fila aparece y el formulario se limpia al instante; el INSERT va en segundo plano.
    const revertir = await agregarMovimientoOptimista(queryClient, nuevoMov);
    setMonto("");
    setNota("");
    setSelectedCat(null);

    const alta = (async () => {
      let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
      try {
        resultado = await transactionsService.crearMovimiento({
          id,
          tipo: tipoSel,
          monto: montoNum,
          medioId: medioObj.id,
          categoriaId: categoriaObj?.id ?? null,
          fecha,
          nota,
        });
      } catch (error) {
        console.error("Error creando movimiento:", error);
      }

      if (resultado.ok) {
        await movimientoCreadoConfirmado(queryClient, nuevoMov);
        return true;
      }

      await revertir();
      // Cada campo solo se restaura si sigue vacío: no se pisa un registro ya empezado.
      setMonto((actual) => (actual === "" ? escrito.monto : actual));
      setNota((actual) => (actual === "" ? escrito.nota : actual));
      setSelectedCat((actual) => (actual === null ? escrito.categoria : actual));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      toast.error("No se pudo guardar el movimiento", {
        description:
          resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
      });
      return false;
    })();

    insertsPendientes.current.set(id, alta);
    await alta;
    insertsPendientes.current.delete(id);
  }

  async function handleDelete(id: string) {
    // Si el alta de esta fila sigue en curso, se espera a que termine (incluida su relectura)
    // para que el DELETE no llegue antes que el INSERT ni reviva la fila. Si el alta falló,
    // la fila ya se revirtió y no hay nada que borrar.
    const alta = insertsPendientes.current.get(id);
    if (alta && !(await alta)) return;

    // La fila desaparece al instante; si la BD rechaza el borrado, reaparece.
    const revertir = await quitarMovimientoOptimista(queryClient, id);

    let resultado: ResultadoOperacion = { ok: false, motivo: "error" };
    try {
      resultado = await transactionsService.eliminarMovimiento(id);
    } catch (error) {
      console.error("Error eliminando movimiento:", error);
    }

    if (resultado.ok) {
      await movimientoEliminadoConfirmado(queryClient);
      return;
    }

    await revertir();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar el movimiento", {
      description: resultado.motivo === "sin-conexion" ? "No hay conexión a internet." : undefined,
    });
  }

  return {
    listRef,
    mediosDisponibles,
    categoriasDisponibles,
    movimientos,
    isLoading,
    tipoSel,
    setTipoSel,
    monto,
    setMonto,
    selectedCat,
    setSelectedCat,
    selectedMedio,
    setSelectedMedio,
    fecha,
    setFecha,
    nota,
    setNota,
    fMsg,
    filtroCategoria,
    setFiltroCategoria,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    categoriasFiltradas,
    handleSubmit,
    handleDelete,
  };
}
