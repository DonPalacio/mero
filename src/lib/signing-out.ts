import { useSyncExternalStore } from "react";

// Marca "se está cerrando la sesión". Mientras dura, el shell privado no se dibuja: así el
// dashboard no se ve en los instantes que tarda el guard en confirmar que ya no hay sesión.
let signingOut = false;
const listeners = new Set<() => void>();

export function setSigningOut(value: boolean) {
  if (signingOut === value) return;
  signingOut = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIsSigningOut() {
  // En el servidor (SSR) nunca se está cerrando sesión.
  return useSyncExternalStore(
    subscribe,
    () => signingOut,
    () => false,
  );
}
