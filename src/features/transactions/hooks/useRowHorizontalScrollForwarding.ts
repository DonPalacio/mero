import { useEffect, useRef } from "react";

// Reenvía el gesto de scroll horizontal desde cualquier punto de una fila
// del historial (ícono, monto, botón de eliminar) hacia la franja de texto
// de esa fila (data-tx-scroll), que es la única que realmente se desplaza.
// Así el scroll-x "se siente" disponible en todo el registro sin mover el
// ícono, el monto ni el botón, y sin tocar el diseño de Transactions.tsx.
function findRowScroll(
  target: EventTarget | null,
  // El mouse no tiene equivalente nativo a "arrastrar para desplazar" (a
  // diferencia del touch), así que para clic-y-arrastrar sí debe activarse
  // aunque el gesto empiece encima del propio texto.
  { allowInsideText = false } = {},
): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const row = target.closest("[data-tx-row]");
  const scrollEl = row?.querySelector<HTMLElement>("[data-tx-scroll]") ?? null;
  if (!scrollEl) return null;
  if (!allowInsideText && scrollEl.contains(target)) return null; // ya lo maneja el navegador
  if (scrollEl.scrollWidth <= scrollEl.clientWidth) return null; // nada que desplazar
  return scrollEl;
}

export function useRowHorizontalScrollForwarding() {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function onWheel(e: WheelEvent) {
      // Solo gestos horizontales explícitos (trackpad o Shift+rueda); una
      // rueda vertical normal debe seguir moviendo la lista, no la fila.
      const delta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (delta === 0) return;
      const scrollEl = findRowScroll(e.target);
      if (!scrollEl) return;
      scrollEl.scrollLeft += delta;
      e.preventDefault();
    }

    const touch: {
      scrollEl: HTMLElement | null;
      x: number;
      y: number;
      lastX: number;
      locked: "x" | "y" | null;
    } = { scrollEl: null, x: 0, y: 0, lastX: 0, locked: null };

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      touch.scrollEl = findRowScroll(e.target);
      touch.x = touch.lastX = t.clientX;
      touch.y = t.clientY;
      touch.locked = null;
    }

    function onTouchMove(e: TouchEvent) {
      if (!touch.scrollEl) return;
      const t = e.touches[0];
      if (!t) return;

      if (!touch.locked) {
        const dx = t.clientX - touch.x;
        const dy = t.clientY - touch.y;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // aún no hay gesto claro
        touch.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (touch.locked === "y") {
          touch.scrollEl = null; // deja que la lista siga con su scroll vertical de siempre
          return;
        }
      }

      touch.scrollEl.scrollLeft -= t.clientX - touch.lastX;
      touch.lastX = t.clientX;
      e.preventDefault();
    }

    function onTouchEnd() {
      touch.scrollEl = null;
      touch.locked = null;
    }

    // Clic y arrastrar con mouse: a diferencia del touch, el navegador no
    // ofrece esto de forma nativa para un overflow-x-auto, así que hay que
    // construirlo. No necesita el "lock" x/y del touch: el scroll vertical
    // por mouse va siempre por la rueda, nunca por arrastre.
    const mouse: {
      scrollEl: HTMLElement | null;
      startX: number;
      startScrollLeft: number;
      dragging: boolean;
    } = {
      scrollEl: null,
      startX: 0,
      startScrollLeft: 0,
      dragging: false,
    };

    function cancelNextClick(e: MouseEvent) {
      // Evita que el mismo gesto de arrastre dispare un clic al soltar
      // (por ejemplo, sobre el botón Eliminar).
      e.stopPropagation();
    }

    function onMouseMove(e: MouseEvent) {
      if (!mouse.scrollEl) return;
      const dx = e.clientX - mouse.startX;
      if (!mouse.dragging) {
        if (Math.abs(dx) < 4) return; // aún puede ser un clic normal
        mouse.dragging = true;
      }
      mouse.scrollEl.scrollLeft = mouse.startScrollLeft - dx;
      e.preventDefault(); // evita seleccionar el texto mientras se arrastra
    }

    function onMouseUp() {
      if (mouse.dragging) {
        document.addEventListener("click", cancelNextClick, { capture: true, once: true });
      }
      mouse.scrollEl = null;
      mouse.dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // solo clic principal
      const scrollEl = findRowScroll(e.target, { allowInsideText: true });
      if (!scrollEl) return;
      mouse.scrollEl = scrollEl;
      mouse.startX = e.clientX;
      mouse.startScrollLeft = scrollEl.scrollLeft;
      mouse.dragging = false;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    // passive:false es necesario para poder cancelar el scroll vertical de la
    // página mientras se arrastra horizontalmente dentro de una fila.
    list.addEventListener("wheel", onWheel, { passive: false });
    list.addEventListener("touchstart", onTouchStart, { passive: true });
    list.addEventListener("touchmove", onTouchMove, { passive: false });
    list.addEventListener("touchend", onTouchEnd);
    list.addEventListener("touchcancel", onTouchEnd);
    list.addEventListener("mousedown", onMouseDown);

    return () => {
      list.removeEventListener("wheel", onWheel);
      list.removeEventListener("touchstart", onTouchStart);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("touchend", onTouchEnd);
      list.removeEventListener("touchcancel", onTouchEnd);
      list.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("click", cancelNextClick, { capture: true });
    };
  }, []);

  return listRef;
}
