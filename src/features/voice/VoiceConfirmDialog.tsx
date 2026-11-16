import { useState } from "react";
import { IconAlertTriangle, IconCheck, IconMicrophone } from "@tabler/icons-react";
import TypeSelector from "@/components/TypeSelector";
import { chipClass } from "@/components/selection-chip";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatTypedAmount, parseAmount } from "@/lib/utils";
import { issueMessage } from "./lib/voice-flow";
import type { useVoiceTransaction } from "./hooks/useVoiceTransaction";

type Voice = ReturnType<typeof useVoiceTransaction>;

const LABEL = "px-1 text-xs text-fn-muted";

// Monto con el mismo campo grande del formulario de Transacciones (punto de miles y coma
// decimal mientras se escribe). El texto vive aquí porque lo escrito puede ser "1.500," sin que
// aún sea un número; al padre solo sube el valor ya interpretado.
function AmountField({
  initial,
  onChange,
}: {
  readonly initial: number;
  readonly onChange: (amount: number) => void;
}) {
  const [text, setText] = useState(
    initial > 0 ? formatTypedAmount(String(initial).replace(".", ",")) : "",
  );
  return (
    <div className="group flex flex-col gap-1">
      <label
        htmlFor="voice-amount"
        className="px-1 text-xs text-fn-muted transition-colors duration-300 group-focus-within:text-fn-text motion-reduce:transition-none"
      >
        Monto
      </label>
      <div className="relative flex items-baseline gap-2 border-b border-fn-line pb-1">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-center scale-x-0 bg-fn-text transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within:scale-x-100 motion-reduce:transition-none"
        />
        <span className="pl-1 text-3xl font-medium text-fn-muted transition-colors duration-300 group-focus-within:text-fn-text motion-reduce:transition-none">
          $
        </span>
        <input
          id="voice-amount"
          type="text"
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-3xl font-semibold tabular-nums text-fn-text outline-none placeholder:text-fn-muted"
          value={text}
          onChange={(event) => {
            const next = formatTypedAmount(event.target.value, text);
            setText(next);
            onChange(parseAmount(next) ?? 0);
          }}
        />
      </div>
    </div>
  );
}

// Tarjeta de confirmación con el mismo lenguaje visual de "Nuevo registro" en Transacciones:
// superficie fn-card, selector Gasto/Ingreso, monto grande, chips de categoría y medio, y fila
// de fecha y nota. Nada se guarda hasta que el usuario acepta; cada campo es editable porque la
// IA puede equivocarse.
export default function VoiceConfirmDialog({ voice }: { readonly voice: Voice }) {
  const { draft } = voice;
  const messages = voice.issues.flatMap((issue) => issueMessage(issue) ?? []);
  const categories = voice.categories.filter((category) => category.type === draft?.type);

  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) voice.cancel();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-[1.75rem] border border-fn-line bg-fn-card p-0 text-fn-text shadow-2xl sm:rounded-[1.75rem]">
        {draft !== null && (
          <form
            className="flex flex-col gap-6 p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void voice.confirm();
            }}
          >
            <div className="flex flex-col gap-1 pr-6">
              <DialogTitle className="flex items-center gap-2 text-[0.9375rem] font-semibold leading-none tracking-tight text-fn-text">
                <IconMicrophone className="size-4 text-fn-muted" aria-hidden />
                Confirma el movimiento
              </DialogTitle>
              <DialogDescription className="text-sm text-fn-muted">
                Revisa lo que entendí antes de guardarlo.
              </DialogDescription>
            </div>

            <TypeSelector
              value={draft.type}
              // La categoría es de un solo tipo: al cambiarlo se descarta la elegida.
              onChange={(type) => voice.edit({ type, categoryId: null })}
            />

            <AmountField initial={draft.amount} onChange={(amount) => voice.edit({ amount })} />

            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Categoría</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isActive = draft.categoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => voice.edit({ categoryId: isActive ? null : category.id })}
                      className={chipClass(isActive)}
                    >
                      {isActive && <IconCheck className="size-3.5" aria-hidden />}
                      {category.name}
                    </button>
                  );
                })}
                {categories.length === 0 && (
                  <span className="text-xs italic text-fn-muted">
                    No hay categorías para este tipo.
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Medio de pago</span>
              <div className="flex flex-wrap gap-2">
                {voice.boxes.map((box) => {
                  const isActive = draft.boxId === box.id;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => voice.edit({ boxId: isActive ? null : box.id })}
                      className={chipClass(isActive)}
                    >
                      {isActive && <IconCheck className="size-3.5" aria-hidden />}
                      {box.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {messages.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {messages.map((message) => (
                  <li
                    key={message}
                    className="flex items-start gap-1.5 text-sm font-medium text-warning"
                  >
                    <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {message}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-end gap-2">
              <div className="flex w-36 shrink-0 flex-col gap-1.5">
                <label htmlFor="voice-date" className={LABEL}>
                  Fecha
                </label>
                <input
                  id="voice-date"
                  type="date"
                  autoComplete="off"
                  className="fn-input scheme-dark h-10 w-full px-3"
                  value={draft.date}
                  onChange={(event) => voice.edit({ date: event.target.value })}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="voice-note" className={LABEL}>
                  Nota
                </label>
                <input
                  id="voice-note"
                  type="text"
                  placeholder="Opcional..."
                  autoComplete="off"
                  className="fn-input h-10 w-full"
                  value={draft.note}
                  onChange={(event) => voice.edit({ note: event.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="fn-button-soft flex-1 px-4 py-2.5"
                onClick={voice.cancel}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="fn-button inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-50"
                disabled={!voice.canConfirm}
              >
                <IconCheck className="size-4" aria-hidden />
                Guardar
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
