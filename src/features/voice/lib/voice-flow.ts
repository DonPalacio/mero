import {
  isValidISODate,
  type DraftIssue,
  type NamedItem,
  type TransactionDraft,
} from "./voice-parse";

// Estado del flujo de dictado. La escucha del micrófono vive aparte (useSpeechRecognition);
// aquí solo se modela qué muestra el panel: nada, "pensando" o la tarjeta de confirmación.
export type VoiceFlowState =
  | { readonly phase: "idle" }
  | { readonly phase: "parsing" }
  | {
      readonly phase: "confirming";
      readonly draft: TransactionDraft;
      readonly issues: readonly DraftIssue[];
    };

export type VoiceFlowAction =
  | { readonly type: "parse-start" }
  | {
      readonly type: "parsed";
      readonly draft: TransactionDraft;
      readonly issues: readonly DraftIssue[];
    }
  | { readonly type: "edit"; readonly patch: Partial<TransactionDraft> }
  | { readonly type: "restore"; readonly draft: TransactionDraft }
  | { readonly type: "reset" };

export const initialVoiceFlow: VoiceFlowState = { phase: "idle" };

// Al corregir un campo a mano, deja de aplicar el aviso que la IA había generado para él.
const ISSUES_BY_FIELD: Readonly<Record<keyof TransactionDraft, readonly DraftIssue[]>> = {
  type: [],
  amount: ["invalid-amount"],
  categoryId: ["missing-category", "unknown-category"],
  boxId: ["missing-box", "unknown-box"],
  date: ["invalid-date"],
  note: [],
};

const resolvedIssues = (
  issues: readonly DraftIssue[],
  patch: Partial<TransactionDraft>,
): readonly DraftIssue[] => {
  const cleared = (Object.keys(patch) as (keyof TransactionDraft)[]).flatMap(
    (field) => ISSUES_BY_FIELD[field],
  );
  return issues.filter((issue) => !cleared.includes(issue));
};

export function voiceFlowReducer(state: VoiceFlowState, action: VoiceFlowAction): VoiceFlowState {
  switch (action.type) {
    case "parse-start":
      return { phase: "parsing" };
    case "parsed":
      return { phase: "confirming", draft: action.draft, issues: action.issues };
    case "edit":
      return state.phase === "confirming"
        ? {
            phase: "confirming",
            draft: { ...state.draft, ...action.patch },
            issues: resolvedIssues(state.issues, action.patch),
          }
        : state;
    case "restore":
      // Solo si el usuario no empezó otro dictado mientras fallaba el guardado.
      return state.phase === "idle"
        ? { phase: "confirming", draft: action.draft, issues: [] }
        : state;
    case "reset":
      return initialVoiceFlow;
  }
}

/** Se puede guardar solo con monto válido, caja elegida y fecha real. */
export function canConfirm(draft: TransactionDraft): boolean {
  return draft.amount > 0 && draft.boxId !== null && isValidISODate(draft.date);
}

/**
 * Caja preseleccionada cuando no se nombró ninguna: la más usada en los movimientos dados;
 * si no hay movimientos, la primera. `undefined` si el usuario no tiene cajas.
 */
export function mostUsedBoxId(
  boxes: readonly NamedItem[],
  transactions: readonly { readonly box: string }[],
): string | undefined {
  const counted = boxes.map((box) => ({
    id: box.id,
    uses: transactions.filter((transaction) => transaction.box === box.name).length,
  }));
  return counted.reduce<{ readonly id: string; readonly uses: number } | undefined>(
    (best, current) => (best === undefined || current.uses > best.uses ? current : best),
    undefined,
  )?.id;
}

/** Rellena la caja con la sugerida solo si el dictado no la resolvió. */
export function withDefaultBox(
  draft: TransactionDraft,
  defaultBoxId: string | undefined,
): TransactionDraft {
  return draft.boxId === null && defaultBoxId !== undefined
    ? { ...draft, boxId: defaultBoxId }
    : draft;
}

/** Aviso para la tarjeta de confirmación; `null` si no hace falta mostrar nada. */
export function issueMessage(issue: DraftIssue): string | null {
  switch (issue) {
    case "invalid-amount":
      return "No entendí el monto. Escríbelo.";
    case "missing-category":
      return "Sin categoría, este movimiento no cuenta en los totales del dashboard.";
    case "unknown-category":
      return "No encontré esa categoría. Elige una o déjalo sin categoría.";
    case "missing-box":
      return "No mencionaste el medio: se puso el más usado. Cámbialo si no es ese.";
    case "unknown-box":
      return "No encontré ese medio. Elige uno.";
    case "invalid-date":
      return "No entendí la fecha: se puso la de hoy.";
  }
}

export function parseFailureMessage(
  reason: "unauthorized" | "unavailable" | "unparseable",
): string {
  switch (reason) {
    case "unauthorized":
      return "Tu sesión expiró. Vuelve a iniciar sesión.";
    case "unavailable":
      return "El asistente no está disponible en este momento.";
    case "unparseable":
      return "No entendí el movimiento. Intenta decirlo de otra forma.";
  }
}
