import { useState } from "react";
import { IconLoader2, IconMicrophone } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useVoiceTransaction } from "./hooks/useVoiceTransaction";
import { speechErrorMessage } from "./lib/speech";
import { MAX_TEXT_LENGTH } from "./lib/voice-api";
import VoiceConfirmDialog from "./VoiceConfirmDialog";

// Alternativa al micrófono para navegadores sin Web Speech API (p. ej. Firefox).
function TypedEntry({ onSubmit }: { readonly onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim() !== "") onSubmit(text.trim());
      }}
    >
      <DialogHeader>
        <DialogTitle>Registrar con texto</DialogTitle>
        <DialogDescription>
          Tu navegador no permite dictar. Escribe el movimiento, por ejemplo: “gasté 25 mil en
          almuerzo con Nequi”.
        </DialogDescription>
      </DialogHeader>
      <input
        type="text"
        autoFocus
        maxLength={MAX_TEXT_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Movimiento a registrar"
        className="fn-input h-10 w-full px-3"
      />
      <button type="submit" className="fn-button px-4 py-2" disabled={text.trim() === ""}>
        Interpretar
      </button>
    </form>
  );
}

// Botón flotante global (esquina inferior derecha) para registrar movimientos hablando.
// Va por encima del dock en móvil y respeta el área segura del dispositivo.
export default function VoiceFab() {
  const voice = useVoiceTransaction();
  const [typing, setTyping] = useState(false);
  const parsing = voice.phase === "parsing";

  // "Cerrando": solo el instante posterior a dejar de escuchar, para reproducir la animación de
  // cierre una vez. Se ajusta durante el render (patrón de React para derivar de un cambio de
  // prop) y termina en onAnimationEnd; así no hace falta un efecto.
  const [wasListening, setWasListening] = useState(false);
  const [closing, setClosing] = useState(false);
  if (voice.listening !== wasListening) {
    setWasListening(voice.listening);
    setClosing(!voice.listening);
  }

  const bubble = voice.listening
    ? voice.interimText || "Escuchando…"
    : parsing
      ? "Interpretando…"
      : voice.speechError !== null
        ? speechErrorMessage(voice.speechError)
        : null;

  const handleClick = () => {
    if (parsing) return;
    if (voice.listening) voice.stopListening();
    else if (voice.supported) voice.startListening();
    else setTyping(true);
  };

  return (
    <>
      <div className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-2 md:right-6 md:bottom-6">
        {bubble !== null && (
          <p
            role="status"
            aria-live="polite"
            className="fn-card max-w-64 rounded-2xl px-3 py-2 text-sm text-fn-text dash-enter"
          >
            {bubble}
          </p>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={parsing}
          aria-label={voice.listening ? "Detener dictado" : "Registrar movimiento por voz"}
          aria-pressed={voice.listening}
          onAnimationEnd={(event) => {
            // Las ondas también emiten animationend: solo cuenta la del propio botón.
            if (event.target === event.currentTarget && closing) setClosing(false);
          }}
          className={cn(
            // Degradado de los íconos de categoría; azul fijo (ver mic-surface en styles.css).
            "mic-surface relative grid size-14 place-items-center rounded-full text-white shadow-lg",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fn-brand",
            voice.listening && "mic-open",
            closing && "mic-close",
          )}
        >
          {voice.listening && (
            <>
              <span
                aria-hidden
                className="mic-ripple pointer-events-none absolute inset-0 rounded-full bg-(--mic-brand)"
              />
              <span
                aria-hidden
                className="mic-ripple pointer-events-none absolute inset-0 rounded-full bg-(--mic-brand) [animation-delay:800ms]"
              />
            </>
          )}
          {parsing ? (
            <IconLoader2 className="relative size-6 motion-safe:animate-spin" aria-hidden />
          ) : (
            <IconMicrophone
              className={cn("relative size-6", (voice.listening || closing) && "mic-icon-pop")}
              aria-hidden
            />
          )}
        </button>
      </div>

      <Dialog open={typing} onOpenChange={setTyping}>
        <DialogContent className="max-w-md">
          <TypedEntry
            onSubmit={(text) => {
              setTyping(false);
              void voice.submitText(text);
            }}
          />
        </DialogContent>
      </Dialog>

      <VoiceConfirmDialog voice={voice} />
    </>
  );
}
