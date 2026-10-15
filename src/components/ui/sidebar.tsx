"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
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

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar w-[300px] shrink-0",
          className,
        )}
        animate={{
          width: animate ? (open ? "300px" : "60px") : "300px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({ className, children, ...props }: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const reduceMotion = useReducedMotion();
  // Solo `transform` (la Web Animations API lo corre fuera del hilo principal): `x` con
  // porcentaje y `opacity` se animaban con JS en cada frame y exigían medir el layout, lo que
  // en celulares de gama media se veía lento. Sin `opacity`: el panel es opaco, no hace falta.
  const slide = {
    duration: reduceMotion ? 0 : 0.3,
    ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  };
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-sidebar w-full",
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2 className="text-foreground" onClick={() => setOpen(!open)} />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ transform: "translateX(-100%)" }}
              animate={{ transform: "translateX(0%)" }}
              exit={{ transform: "translateX(-100%)" }}
              transition={slide}
              style={{ willChange: "transform" }}
              className={cn(
                "fixed h-full w-full inset-0 bg-background p-10 z-[100] flex flex-col justify-between",
                className,
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-foreground"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
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

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
