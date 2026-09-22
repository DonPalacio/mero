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

// Interfaz para recibir el <Outlet /> desde __root.tsx
interface SidebarLayoutProps {
  children?: React.ReactNode;
}

export default function SidebarDemo({ children }: SidebarLayoutProps) {
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard", // Apunta a la ruta que acabamos de crear
      icon: <IconLayoutDashboard className="text-foreground h-5 w-5 shrink-0" />,
    },
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
  ];
  const [open, setOpen] = useState(false);

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
          <div>
            <SidebarLink
              link={{
                label: "Logout",
                href: "/logout",
                icon: <IconArrowLeft className="text-foreground h-5 w-5 shrink-0" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Aquí se renderiza la vista de la URL actual */}
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
      <div className="h-5 w-6 bg-foreground rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-foreground whitespace-pre"
      >
        Mero
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
      <div className="h-5 w-6 bg-foreground rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm shrink-0" />
    </a>
  );
};
