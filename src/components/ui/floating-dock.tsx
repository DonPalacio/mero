"use client";
import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchScreen } from "@/lib/queries";

export interface DockItem {
  label: string;
  icon: ReactNode;
  // Sin `href` el ítem es un botón (p. ej. cerrar sesión) y no se marca como activo.
  href?: string;
  onClick?: () => void;
}

// Dock flotante solo para móvil (< md). Siempre visible: sin menú desplegable ni hover.
export function FloatingDock({ items }: { items: DockItem[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  return (
    <>
      {/* Franja difuminada detrás del dock: deja entrever el contenido que sigue al hacer scroll
          y se desvanece hacia arriba para no marcar un corte. No captura toques. */}
      <div
        aria-hidden
        className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[calc(7rem+env(safe-area-inset-bottom))] bg-background/10 backdrop-blur-sm [mask-image:linear-gradient(to_top,black_30%,transparent)]"
      />
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed inset-x-0 bottom-3 z-50 mx-auto w-fit max-w-[calc(100vw-1rem)] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-start gap-1 rounded-3xl border border-white/10 bg-[color-mix(in_oklab,var(--card),var(--background))] px-2 py-2 shadow-lg">
          {items.map((item) => {
            const isActive = item.href !== undefined && pathname === item.href;
            const content = (
              <>
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    isActive ? "bg-white text-black" : "text-white",
                  )}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap text-[10px] leading-none text-white">
                  {item.label}
                </span>
              </>
            );
            const itemClass = "flex min-w-14 flex-col items-center gap-1 px-1";

            return (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    to={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    // Los datos de la pantalla se piden antes del clic, igual que en la sidebar.
                    onTouchStart={() => prefetchScreen(queryClient, item.href as string)}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={item.label}
                    onClick={item.onClick}
                    className={itemClass}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
