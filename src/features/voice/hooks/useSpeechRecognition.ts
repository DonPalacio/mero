import { useCallback, useEffect, useReducer, useState } from "react";
import {
  getRecognitionCtor,
  initialSpeechState,
  joinTranscript,
  mapSpeechError,
  speechReducer,
  type SpeechRecognitionLike,
  type SpeechScope,
} from "../lib/speech";

const LANGUAGE = "es-CO";

/**
 * Envuelve la Web Speech API. Es el único borde con el navegador: la lógica de estado vive
 * en `speechReducer` (puro). La instancia se guarda en estado, no en una ref mutable, y se
 * crea en un efecto porque en el servidor (SSR) no existe `window`.
 */
export function useSpeechRecognition() {
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const [state, dispatch] = useReducer(speechReducer, initialSpeechState);

  useEffect(() => {
    const Ctor = getRecognitionCtor(window as unknown as SpeechScope);
    if (Ctor === undefined) return undefined;

    const instance = new Ctor();
    Object.assign(instance, {
      lang: LANGUAGE,
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      onresult: (event: { readonly results: Parameters<typeof joinTranscript>[0] }) =>
        dispatch({ type: "result", transcript: joinTranscript(event.results) }),
      onerror: (event: { readonly error: string }) => {
        const error = mapSpeechError(event.error);
        if (error !== undefined) dispatch({ type: "fail", error });
      },
      onend: () => dispatch({ type: "end" }),
    });
    setRecognition(instance);

    return () => {
      // Se sueltan los manejadores antes de abortar para no despachar sobre un componente desmontado.
      Object.assign(instance, { onresult: null, onerror: null, onend: null });
      instance.abort();
      setRecognition(null);
    };
  }, []);

  const start = useCallback(() => {
    if (recognition === null) return;
    dispatch({ type: "start" });
    try {
      recognition.start();
    } catch {
      // start() lanza si ya hay una sesión activa.
      dispatch({ type: "fail", error: "unknown" });
    }
  }, [recognition]);

  const stop = useCallback(() => recognition?.stop(), [recognition]);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    /** `false` también durante el primer render, hasta que el efecto detecta el soporte. */
    supported: recognition !== null,
    status: state.status,
    transcript: state.transcript,
    error: state.error,
    start,
    stop,
    reset,
  };
}
