import { z } from "zod";

// Máximo de decimales que acepta el formulario de Transacciones (ver useTransactionForm).
const MAX_DECIMALS = 3;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const transactionTypeSchema = z.enum(["expense", "income"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/** Lo que devuelve la IA: solo nombres y valores crudos, nunca ids. */
export const aiResultSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().finite(),
  categoryName: z.string().nullable(),
  boxName: z.string().nullable(),
  date: z.string().nullable(),
  note: z.string(),
});
export type AiResult = z.infer<typeof aiResultSchema>;

export interface NamedItem {
  readonly id: string;
  readonly name: string;
}

export interface CategoryItem extends NamedItem {
  readonly type: TransactionType;
}

export type DraftIssue =
  | "invalid-amount"
  | "missing-category"
  | "unknown-category"
  | "missing-box"
  | "unknown-box"
  | "invalid-date";

export interface TransactionDraft {
  readonly type: TransactionType;
  readonly amount: number;
  readonly categoryId: string | null;
  readonly boxId: string | null;
  readonly date: string;
  readonly note: string;
}

export interface ResolvedDraft {
  readonly draft: TransactionDraft;
  readonly issues: readonly DraftIssue[];
}

/** Minúsculas, sin tildes y con espacios colapsados, para comparar nombres hablados. */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca por nombre: primero coincidencia exacta; si no, una única coincidencia parcial.
 * Si la parcial es ambigua devuelve `undefined`, para no elegir mal con dinero de por medio.
 */
export function matchByName<T extends NamedItem>(
  name: string | null,
  items: readonly T[],
): T | undefined {
  const target = name === null ? "" : normalizeName(name);
  if (target === "") return undefined;
  const exact = items.find((item) => normalizeName(item.name) === target);
  if (exact !== undefined) return exact;
  const partial = items.filter((item) => {
    const candidate = normalizeName(item.name);
    return candidate.includes(target) || target.includes(candidate);
  });
  return partial.length === 1 ? partial[0] : undefined;
}

/** Redondea al máximo de decimales permitido; `undefined` si no es un monto válido. */
export function toAmountNumber(value: number): number | undefined {
  const factor = 10 ** MAX_DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return Number.isFinite(rounded) && rounded > 0 ? rounded : undefined;
}

/** Valida que sea una fecha ISO real (rechaza "2026-02-31"). */
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Convierte la respuesta de la IA en un borrador con ids reales del usuario.
 * La categoría solo se busca entre las del mismo tipo (gasto/ingreso).
 * Lo que no se pueda resolver queda en `null` y se reporta en `issues` para que
 * la tarjeta de confirmación pida elegirlo.
 */
export function resolveDraft(
  ai: AiResult,
  categories: readonly CategoryItem[],
  boxes: readonly NamedItem[],
  today: string,
): ResolvedDraft {
  const amount = toAmountNumber(ai.amount);
  const category = matchByName(
    ai.categoryName,
    categories.filter((item) => item.type === ai.type),
  );
  const box = matchByName(ai.boxName, boxes);
  const dateIsValid = ai.date !== null && isValidISODate(ai.date);

  const issues: readonly DraftIssue[] = [
    ...(amount === undefined ? (["invalid-amount"] as const) : []),
    ...(category !== undefined
      ? []
      : ai.categoryName === null
        ? (["missing-category"] as const)
        : (["unknown-category"] as const)),
    ...(box !== undefined
      ? []
      : ai.boxName === null
        ? (["missing-box"] as const)
        : (["unknown-box"] as const)),
    ...(ai.date === null || dateIsValid ? [] : (["invalid-date"] as const)),
  ];

  return {
    draft: {
      type: ai.type,
      amount: amount ?? 0,
      categoryId: category?.id ?? null,
      boxId: box?.id ?? null,
      date: ai.date !== null && dateIsValid ? ai.date : today,
      note: ai.note.trim(),
    },
    issues,
  };
}
