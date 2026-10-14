import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transactions.service";
import {
  addTransactionOptimistic,
  categoriesQuery,
  boxesQuery,
  transactionCreatedConfirmed,
  transactionDeletedConfirmed,
  monthsWithTransactionsQuery,
  monthTransactionsQuery,
  removeTransactionOptimistic,
} from "@/lib/queries";
import { toast } from "sonner";
import type { OperationResult } from "@/lib/supabase-errors";
import { localISODate, generateUuid, parseAmount } from "@/lib/utils";

// Reenvía el gesto de scroll horizontal desde cualquier punto de una fila
// del historial (ícono, monto, botón de eliminar) hacia la franja de texto
// de esa fila (data-mov-scroll), que es la única que realmente se desplaza.
// Así el scroll-x "se siente" disponible en todo el registro sin mover el
// ícono, el monto ni el botón, y sin tocar el diseño de Transactions.tsx.
function findRowScroll(
  target: EventTarget | null,
  // El mouse no tiene equivalente nativo a "arrastrar para desplazar" (a
  // diferencia del touch), así que para clic-y-arrastrar sí debe activarse
  // aunque el gesto empiece encima del propio texto.
  { allowInsideText = false } = {},
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const row = target.closest("[data-tx-row]");
  const scrollEl = row?.querySelector<HTMLElement>("[data-tx-scroll]") ?? null;
  if (!scrollEl) return null;
  if (!allowInsideText && scrollEl.contains(target)) return null; // ya lo maneja el navegador
  if (scrollEl.scrollWidth <= scrollEl.clientWidth) return null; // nada que desplazar
  return scrollEl;
}

function useRowHorizontalScrollForwarding() {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function onWheel(e: WheelEvent) {
      // Solo gestos horizontales explícitos (trackpad o Shift+rueda); una
      // rueda vertical normal debe seguir moviendo la lista, no la fila.
      const delta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (delta === 0) return;
      const scrollEl = findRowScroll(e.target);
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
      touch.scrollEl = findRowScroll(e.target);
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

    function cancelNextClick(e: MouseEvent) {
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
        document.addEventListener("click", cancelNextClick, { capture: true, once: true });
      }
      mouse.scrollEl = null;
      mouse.dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // solo clic principal
      const scrollEl = findRowScroll(e.target, { allowInsideText: true });
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
    list.addEventListener("wheel", onWheel, { passive: false });
    list.addEventListener("touchstart", onTouchStart, { passive: true });
    list.addEventListener("touchmove", onTouchMove, { passive: false });
    list.addEventListener("touchend", onTouchEnd);
    list.addEventListener("touchcancel", onTouchEnd);
    list.addEventListener("mousedown", onMouseDown);

    return () => {
      list.removeEventListener("wheel", onWheel);
      list.removeEventListener("touchstart", onTouchStart);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("touchend", onTouchEnd);
      list.removeEventListener("touchcancel", onTouchEnd);
      list.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("click", cancelNextClick, { capture: true });
    };
  }, []);

  return listRef;
}

export interface CategoryBase {
  name: string;
  type: "expense" | "income";
}

export interface Transaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  box: string;
  date: string;
  note: string;
}

const NO_TRANSACTIONS: Transaction[] = [];

// Ventana de historial (en meses, hacia atrás desde el actual) en la que se buscan
// los meses con movimientos para el selector. No se muestra: solo acota la búsqueda.
const HISTORY_MONTHS = 24;

export function useTransactions() {
  const listRef = useRowHorizontalScrollForwarding();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const queryClient = useQueryClient();
  // Solo se pide el mes que se está viendo; cada mes se cachea por separado.
  const transactionsQ = useQuery(monthTransactionsQuery(selectedMonth));
  const boxesQ = useQuery(boxesQuery);
  const categoriesQ = useQuery(categoriesQuery);

  // Primer día de la ventana de historial: desde ahí se buscan los meses con movimientos.
  const [currentYear = 0, currentMonthNumber = 1] = currentMonth.split("-").map(Number);
  const windowStart = new Date(currentYear, currentMonthNumber - HISTORY_MONTHS, 1);
  const fromDate = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, "0")}-01`;
  const monthsQ = useQuery(monthsWithTransactionsQuery(fromDate));

  const transactions = transactionsQ.data ?? NO_TRANSACTIONS;
  const isLoading = transactionsQ.isPending || boxesQ.isPending || categoriesQ.isPending;

  // Precarga el mes anterior y el siguiente (sin pasar del actual) para que al cambiar
  // de mes la lista ya esté en caché. prefetchQuery respeta el staleTime y no lanza errores.
  useEffect(() => {
    const [yearNumber = 0, monthNumber = 1] = selectedMonth.split("-").map(Number);
    [new Date(yearNumber, monthNumber - 2, 1), new Date(yearNumber, monthNumber, 1)]
      .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
      .filter((month) => month <= currentMonth)
      .forEach((month) => queryClient.prefetchQuery(monthTransactionsQuery(month)));
  }, [selectedMonth, currentMonth, queryClient]);

  // Los selectores se muestran ordenados por nombre
  const boxesData = useMemo(
    () => [...(boxesQ.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [boxesQ.data],
  );
  const categoriesData = useMemo(
    () => [...(categoriesQ.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [categoriesQ.data],
  );

  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [date, setDate] = useState(localISODate());
  const [note, setNote] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Si la pantalla sigue abierta al pasar la medianoche (hora local), el campo fecha avanza
  // al nuevo día, pero solo si seguía en "hoy": una fecha elegida a mano no se toca.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function schedule() {
      const currentMoment = new Date();
      const todayWhenScheduling = localISODate(currentMoment);
      const midnight = new Date(
        currentMoment.getFullYear(),
        currentMoment.getMonth(),
        currentMoment.getDate() + 1,
      );
      timer = setTimeout(() => {
        const newToday = localISODate();
        setDate((current) => (current === todayWhenScheduling ? newToday : current));
        schedule();
      }, midnight.getTime() - currentMoment.getTime());
    }

    schedule();
    return () => clearTimeout(timer);
  }, []);

  const availableBoxes = boxesData.map((m) => m.name);
  const availableCategories: CategoryBase[] = categoriesData.map((c) => ({
    name: c.name,
    type: c.type,
  }));

  const filteredCategories = availableCategories.filter((c) => c.type === selectedType);

  // Meses disponibles para filtrar la tabla: los que tengan movimientos (dentro de la
  // ventana de MESES_DE_HISTORIAL) + el mes actual y el seleccionado siempre presentes.
  const monthOptions = useMemo(() => {
    const months = new Set<string>([...(monthsQ.data ?? []), currentMonth, selectedMonth]);

    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // más reciente primero
      .map((m) => {
        const [year = 0, month = 1] = m.split("-").map(Number);
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [monthsQ.data, currentMonth, selectedMonth]);

  // Altas en curso por id (true = guardada, false = falló y se revirtió). Lo usa handleDelete.
  const pendingInserts = useRef(new Map<string, Promise<boolean>>());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNumber = parseAmount(amount);

    if (amountNumber === undefined || amountNumber <= 0) {
      setFormMessage("Ingresa un monto válido mayor a 0 (hasta 3 decimales)");
      return;
    }
    if (!selectedBox) {
      setFormMessage("Selecciona un medio (Box)");
      return;
    }
    // El campo de fecha se puede vaciar en el navegador.
    if (!date) {
      setFormMessage("Selecciona una fecha");
      return;
    }

    // La categoría es opcional: sin ella, el movimiento no se contabiliza
    // en los totales del dashboard (sirve para traspasos entre medios).
    const categoryObject = selectedCategory
      ? categoriesData.find((c) => c.name === selectedCategory)
      : undefined;
    const boxObject = boxesData.find((m) => m.name === selectedBox);

    // Una selección que ya no existe (se borró o renombró en otra pantalla) se descarta:
    // sin esto, una categoría inexistente se guardaría como "sin categoría" sin avisar.
    if (!boxObject) {
      setSelectedBox(null);
      setFormMessage("Medio inválido");
      return;
    }
    if (selectedCategory && !categoryObject) {
      setSelectedCategory(null);
      setFormMessage("Categoría inválida");
      return;
    }

    setFormMessage("");

    const id = generateUuid();
    const newTransaction: Transaction = {
      id,
      type: selectedType,
      amount: amountNumber,
      category: selectedCategory ?? "",
      box: selectedBox,
      date,
      note,
    };
    // Lo escrito, para devolverlo al formulario si la BD rechaza el movimiento.
    const typed = { amount, note, category: selectedCategory };

    // La fila aparece y el formulario se limpia al instante; el INSERT va en segundo plano.
    const revert = await addTransactionOptimistic(queryClient, newTransaction);
    setAmount("");
    setNote("");
    setSelectedCategory(null);

    const creation = (async () => {
      let result: OperationResult = { ok: false, reason: "error" };
      try {
        result = await transactionsService.createTransaction({
          id,
          type: selectedType,
          amount: amountNumber,
          boxId: boxObject.id,
          categoryId: categoryObject?.id ?? null,
          date,
          note,
        });
      } catch (error) {
        console.error("Error creando movimiento:", error);
      }

      if (result.ok) {
        await transactionCreatedConfirmed(queryClient, newTransaction);
        return true;
      }

      await revert();
      // Cada campo solo se restaura si sigue vacío: no se pisa un registro ya empezado.
      setAmount((current) => (current === "" ? typed.amount : current));
      setNote((current) => (current === "" ? typed.note : current));
      setSelectedCategory((current) => (current === null ? typed.category : current));
      // Solo se explica la causa cuando se sabe con certeza cuál fue.
      toast.error("No se pudo guardar el movimiento", {
        description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
      });
      return false;
    })();

    pendingInserts.current.set(id, creation);
    await creation;
    pendingInserts.current.delete(id);
  }

  async function handleDelete(id: string) {
    // Si el alta de esta fila sigue en curso, se espera a que termine (incluida su relectura)
    // para que el DELETE no llegue antes que el INSERT ni reviva la fila. Si el alta falló,
    // la fila ya se revirtió y no hay nada que borrar.
    const creation = pendingInserts.current.get(id);
    if (creation && !(await creation)) return;

    // La fila desaparece al instante; si la BD rechaza el borrado, reaparece.
    const revert = await removeTransactionOptimistic(queryClient, id);

    let result: OperationResult = { ok: false, reason: "error" };
    try {
      result = await transactionsService.deleteTransaction(id);
    } catch (error) {
      console.error("Error eliminando movimiento:", error);
    }

    if (result.ok) {
      await transactionDeletedConfirmed(queryClient);
      return;
    }

    await revert();
    // Solo se explica la causa cuando se sabe con certeza cuál fue.
    toast.error("No se pudo eliminar el movimiento", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }

  return {
    listRef,
    availableBoxes,
    availableCategories,
    transactions,
    isLoading,
    selectedType,
    setSelectedType,
    amount,
    setAmount,
    selectedCategory,
    setSelectedCategory,
    selectedBox,
    setSelectedBox,
    date,
    setDate,
    note,
    setNote,
    formMessage,
    categoryFilter,
    setCategoryFilter,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    filteredCategories,
    handleSubmit,
    handleDelete,
  };
}
