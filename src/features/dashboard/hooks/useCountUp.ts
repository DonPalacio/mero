import { useEffect, useLayoutEffect, useRef } from "react";
import { fmt } from "@/lib/utils";

// En el servidor no existe layout effect: se usa useEffect para evitar el aviso de React.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Ease-out fuerte (cuártica): arranca rápido y asienta suave, como el resto de la pantalla.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

const FIRST_MS = 600; // al aparecer la pantalla
const CHANGE_MS = 350; // al cambiar de mes o de dato

// Anima una cifra desde el valor que se ve hasta `value` escribiendo directo en el DOM (sin
// setState por frame: no re-renderiza). Es interrumpible: si llega otro valor a mitad, parte
// de lo que ya se muestra. Con "reducir movimiento" salta al valor final.
export function useCountUp(value: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const first = shown.current === null;
    const from = shown.current ?? 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || from === value) {
      el.textContent = fmt(value);
      shown.current = value;
      return;
    }

    const duration = first ? FIRST_MS : CHANGE_MS;
    const start = performance.now();
    let frame = 0;

    // Antes del primer frame ya se muestra el punto de partida, sin parpadeo del valor final.
    el.textContent = fmt(Math.round(from));

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const current = t >= 1 ? value : from + (value - from) * easeOut(t);
      shown.current = current;
      // Durante la animación se muestran enteros; al terminar, el valor exacto.
      el.textContent = fmt(t >= 1 ? value : Math.round(current));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return ref;
}
