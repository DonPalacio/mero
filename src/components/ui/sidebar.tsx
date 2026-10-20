"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchScreen } from "@/lib/queries";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean | undefined;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  animate?: boolean | undefined;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

// En móvil la navegación es el FloatingDock (ver Sidebar.tsx); aquí solo queda la de escritorio.
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return <DesktopSidebar {...props} />;
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const reduceMotion = useReducedMotion();
  // Al expandirse, la sidebar NO empuja el contenido: el hueco de 60px en el layout es fijo y el
  // panel (300px) se superpone, revelándose con clip-path. Así la animación solo repinta la
  // sidebar y no provoca reflujo en las pantallas (grids, SVG y container queries).
  return (
    <div className="relative hidden w-[60px] shrink-0 md:block">
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 z-30 hidden w-[300px] px-4 py-4 md:flex md:flex-col bg-sidebar border-r border-sidebar-border",
          className,
        )}
        initial={false}
        animate={{
          clipPath: animate && !open ? "inset(0px 240px 0px 0px)" : "inset(0px 0px 0px 0px)",
        }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  );
};

export const SidebarLink = ({ link, className, ...props }: { link: Links; className?: string }) => {
  const { open, animate, setOpen } = useSidebar();
  const routerState = useRouterState();
  const queryClient = useQueryClient();
  const isActive = routerState.location.pathname === link.href;

  return (
    <Link
      to={link.href}
      onClick={() => setOpen(false)}
      // Los datos de la pantalla se piden antes del clic: al abrirla ya están en caché.
      onMouseEnter={() => prefetchScreen(queryClient, link.href)}
      onFocus={() => prefetchScreen(queryClient, link.href)}
      onTouchStart={() => prefetchScreen(queryClient, link.href)}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        isActive && "opacity-100",
        !isActive && "opacity-80 hover:opacity-100",
        className,
      )}
      {...props}
    >
      {link.icon}

      {/* Siempre en el layout (sin alternar `display`): solo cambia la opacidad y el panel recorta. */}
      <motion.span
        initial={false}
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.15 }}
        className="text-foreground text-sm group-hover/sidebar:translate-x-1 transition-transform duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
