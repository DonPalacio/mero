"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconCashRegister,
  IconPackages,
  IconCategory2,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SidebarLayoutProps {
  children?: React.ReactNode;
}

export default function SidebarDemo({ children }: SidebarLayoutProps) {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Transacciones",
      href: "/transactions",
      icon: <IconCashRegister stroke={2} className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
      label: "Categorías",
      href: "/categories",
      icon: <IconCategory2 className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
      label: "Cajas",
      href: "/boxes",
      icon: <IconPackages className="text-foreground h-5 w-5 shrink-0" />,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <IconLayoutDashboard className="text-foreground h-5 w-5 shrink-0" />,
    },
  ];

  // El redirect a /login lo maneja automáticamente el guard de __root.tsx
  // (onAuthStateChange -> router.invalidate() -> beforeLoad detecta sesión nula)
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await supabase.auth.signOut();
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-sidebar w-full flex-1 mx-auto overflow-hidden",
        "h-screen",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          <div onClick={handleLogout} className="cursor-pointer">
            <SidebarLink
              link={{
                label: "Cerrar sesión",
                href: "#",
                icon: <IconArrowLeft className="text-foreground h-5 w-5 shrink-0" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {children}

    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      {/* Imagen de la ardilla pintada de blanco con Tailwind */}
      <img 
        src="/favicon.ico" 
        alt="Mero Logo" 
        className="h-7 w-7 shrink-0 brightness-0 invert" 
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-foreground whitespace-pre"
      >
        MERO
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      {/* Imagen de la ardilla pintada de blanco con Tailwind (Modo colapsado) */}
      <img 
        src="/favicon.ico" 
        alt="Mero Logo" 
        className="h-7 w-7 shrink-0 brightness-0 invert" 
      />
    </a>
  );
};
