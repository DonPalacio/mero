// Lógica pura del reconocimiento de voz. TypeScript no trae los tipos de la Web Speech API,
// así que se declara solo la parte que se usa.

export interface SpeechAlternativeLike {
  readonly transcript: string;
}

export interface SpeechResultLike extends ArrayLike<SpeechAlternativeLike> {
  readonly isFinal: boolean;
}

export interface SpeechResultEventLike {
  readonly results: ArrayLike<SpeechResultLike>;
}

export interface SpeechErrorEventLike {
  readonly error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface SpeechScope {
  readonly SpeechRecognition?: SpeechRecognitionCtor | undefined;
  readonly webkitSpeechRecognition?: SpeechRecognitionCtor | undefined;
}

export type SpeechError =
  "permission-denied" | "no-speech" | "no-microphone" | "network" | "unknown";

export interface SpeechState {
  readonly status: "idle" | "listening" | "error";
  readonly transcript: string;
  readonly error: SpeechError | null;
}

export type SpeechAction =
  | { readonly type: "start" }
  | { readonly type: "result"; readonly transcript: string }
  | { readonly type: "end" }
  | { readonly type: "fail"; readonly error: SpeechError }
  | { readonly type: "reset" };

export const initialSpeechState: SpeechState = { status: "idle", transcript: "", error: null };

/** Constructor del navegador (estándar o con prefijo de Chrome/Safari); `undefined` si no hay. */
export function getRecognitionCtor(scope: SpeechScope): SpeechRecognitionCtor | undefined {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** Une los fragmentos reconocidos (parciales y finales) en una sola frase. */
export function joinTranscript(results: ArrayLike<SpeechResultLike>): string {
  return Array.from(results)
    .map((result) => result[0]?.transcript ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Traduce el código de error del navegador. `undefined` para "aborted": lo provoca
 * nuestro propio `abort()` al desmontar y no es un fallo que mostrar.
 */
export function mapSpeechError(code: string): SpeechError | undefined {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission-denied";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "no-microphone";
    case "network":
      return "network";
    case "aborted":
      return undefined;
    default:
      return "unknown";
  }
}

export function speechErrorMessage(error: SpeechError): string {
  switch (error) {
    case "permission-denied":
      return "Permite el uso del micrófono en tu navegador para dictar movimientos.";
    case "no-speech":
      return "No te escuché. Intenta de nuevo.";
    case "no-microphone":
      return "No se encontró un micrófono.";
    case "network":
      return "No hay conexión para reconocer la voz.";
    case "unknown":
      return "No se pudo reconocer la voz.";
  }
}

export function speechReducer(state: SpeechState, action: SpeechAction): SpeechState {
  switch (action.type) {
    case "start":
      return { status: "listening", transcript: "", error: null };
    case "result":
      return { ...state, transcript: action.transcript };
    case "end":
      // El navegador dispara "end" también después de un error: se conserva el error.
      return state.status === "error" ? state : { ...state, status: "idle" };
    case "fail":
      return { ...state, status: "error", error: action.error };
    case "reset":
      return initialSpeechState;
  }
}
