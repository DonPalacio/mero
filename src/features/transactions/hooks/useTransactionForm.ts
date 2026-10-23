import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionsService, type TransactionRow } from "../services/transactions.service";
import {
  addTransactionOptimistic,
  transactionCreatedConfirmed,
  transactionDeletedConfirmed,
  removeTransactionOptimistic,
} from "@/lib/queries";
import type { OperationResult } from "@/lib/supabase-errors";
import { localISODate, generateUuid, parseAmount } from "@/lib/utils";

interface FormBox {
  id: string;
  name: string;
}

interface FormCategory {
  id: string;
  name: string;
}

// Formulario de registro de movimientos y las dos escrituras (crear y eliminar). El borrado vive
// aquí porque comparte `pendingInserts` con el alta: debe esperar a que termine antes de borrar.
export function useTransactionForm(boxes: FormBox[], categories: FormCategory[]) {
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [date, setDate] = useState(localISODate());
  const [note, setNote] = useState("");
  const [formMessage, setFormMessage] = useState("");

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
      ? categories.find((c) => c.name === selectedCategory)
      : undefined;
    const boxObject = boxes.find((m) => m.name === selectedBox);

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
    const newTransaction: TransactionRow = {
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
    handleSubmit,
    handleDelete,
  };
}
