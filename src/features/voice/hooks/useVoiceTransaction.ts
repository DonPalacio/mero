import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  transactionsService,
  type TransactionRow,
} from "@/features/transactions/services/transactions.service";
import {
  addTransactionOptimistic,
  boxesQuery,
  categoriesQuery,
  monthTransactionsQuery,
  toMonthKey,
  transactionCreatedConfirmed,
} from "@/lib/queries";
import type { OperationResult } from "@/lib/supabase-errors";
import { generateUuid, localISODate } from "@/lib/utils";
import {
  canConfirm,
  initialVoiceFlow,
  mostUsedBoxId,
  parseFailureMessage,
  voiceFlowReducer,
  withDefaultBox,
} from "../lib/voice-flow";
import { resolveDraft, type TransactionDraft } from "../lib/voice-parse";
import { parseVoiceTransaction } from "../services/voice.functions";
import { useSpeechRecognition } from "./useSpeechRecognition";

const createFailure: OperationResult = { ok: false, reason: "error" };

// Un fallo de red o de la BD nunca debe lanzar: se convierte en resultado, como en el formulario.
const attemptCreate = (
  params: Parameters<typeof transactionsService.createTransaction>[0],
): Promise<OperationResult> =>
  transactionsService.createTransaction(params).catch((error: unknown) => {
    console.error("Error creando movimiento por voz:", error);
    return createFailure;
  });

/**
 * Orquesta el registro por voz: escuchar → interpretar con IA → confirmar → guardar.
 * La IA solo devuelve nombres; los ids se resuelven aquí contra las listas reales del usuario,
 * y el guardado usa el mismo flujo optimista que la pantalla de Transacciones.
 */
export function useVoiceTransaction() {
  const queryClient = useQueryClient();
  const speech = useSpeechRecognition();
  const [flow, dispatch] = useReducer(voiceFlowReducer, initialVoiceFlow);

  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: boxes = [] } = useQuery(boxesQuery);
  const { data: monthTransactions = [] } = useQuery(monthTransactionsQuery(toMonthKey(new Date())));

  const defaultBoxId = useMemo(
    () => mostUsedBoxId(boxes, monthTransactions),
    [boxes, monthTransactions],
  );

  const submitText = useCallback(
    async (text: string) => {
      dispatch({ type: "parse-start" });
      const today = localISODate();
      const response = await parseVoiceTransaction({
        data: {
          text,
          categories: categories.map(({ name, type }) => ({ name, type })),
          boxes: boxes.map(({ name }) => ({ name })),
          today,
        },
      }).catch((error: unknown) => {
        console.error("Error interpretando el dictado:", error);
        return null;
      });

      if (response === null || !response.ok) {
        toast.error("No se pudo interpretar el movimiento", {
          description: parseFailureMessage(response === null ? "unavailable" : response.reason),
        });
        dispatch({ type: "reset" });
        return;
      }

      const { draft, issues } = resolveDraft(response.result, categories, boxes, today);
      dispatch({ type: "parsed", draft: withDefaultBox(draft, defaultBoxId), issues });
    },
    [categories, boxes, defaultBoxId],
  );

  // Al terminar de hablar (escuchando → inactivo) con texto reconocido, se interpreta una sola
  // vez: `reset` limpia la transcripción para que este efecto no se repita.
  const { status, transcript, reset: resetSpeech } = speech;
  useEffect(() => {
    if (status !== "idle" || transcript === "" || flow.phase !== "idle") return;
    resetSpeech();
    void submitText(transcript);
  }, [status, transcript, flow.phase, resetSpeech, submitText]);

  const confirm = useCallback(async () => {
    if (flow.phase !== "confirming" || !canConfirm(flow.draft)) return;
    const { draft } = flow;
    const box = boxes.find((item) => item.id === draft.boxId);
    if (box === undefined) return;
    const category = categories.find((item) => item.id === draft.categoryId);

    const id = generateUuid();
    const row: TransactionRow = {
      id,
      type: draft.type,
      amount: draft.amount,
      category: category?.name ?? "",
      box: box.name,
      date: draft.date,
      note: draft.note,
    };

    // La fila aparece y el panel se cierra al instante; el INSERT va en segundo plano.
    const revert = await addTransactionOptimistic(queryClient, row);
    dispatch({ type: "reset" });

    const result = await attemptCreate({
      id,
      type: draft.type,
      amount: draft.amount,
      boxId: box.id,
      categoryId: category?.id ?? null,
      date: draft.date,
      note: draft.note,
    });

    if (result.ok) {
      await transactionCreatedConfirmed(queryClient, row);
      toast.success("Movimiento registrado");
      return;
    }

    await revert();
    // Se devuelve el borrador para que el usuario no tenga que dictarlo de nuevo.
    dispatch({ type: "restore", draft });
    toast.error("No se pudo guardar el movimiento", {
      description: result.reason === "offline" ? "No hay conexión a internet." : undefined,
    });
  }, [flow, boxes, categories, queryClient]);

  const edit = useCallback(
    (patch: Partial<TransactionDraft>) => dispatch({ type: "edit", patch }),
    [],
  );

  const cancel = useCallback(() => {
    resetSpeech();
    dispatch({ type: "reset" });
  }, [resetSpeech]);

  return {
    supported: speech.supported,
    listening: speech.status === "listening",
    interimText: speech.transcript,
    speechError: speech.error,
    phase: flow.phase,
    draft: flow.phase === "confirming" ? flow.draft : null,
    issues: flow.phase === "confirming" ? flow.issues : [],
    canConfirm: flow.phase === "confirming" && canConfirm(flow.draft),
    categories,
    boxes,
    startListening: speech.start,
    stopListening: speech.stop,
    /** Alternativa al micrófono (navegador sin Web Speech API): interpretar texto escrito. */
    submitText,
    edit,
    confirm,
    cancel,
  };
}
