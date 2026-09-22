# Component Integration Hub

You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/sidebar-demo.tsx

File content: "use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function SidebarDemo() {
  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        
      ),
    },
    {
      label: "Profile",
      href: "#",
      icon: (
        
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    


      
        
          


            {open ?  : }
            


              {links.map((link, idx) => (
                
              ))}
            


          


          


            
                ),
              }}
            />
          


        
      
      
    


  );
}
export const Logo = () => {
  return (
    
      


      
        Acet Labs
      
    
  );
};
export const LogoIcon = () => {
  return (
    
      


    
  );
};

// Dummy dashboard component with content
const Dashboard = () => {
  return (
    


      


        


          {[...new Array(4)].map((i, idx) => (
            


          ))}
        


        


          {[...new Array(2)].map((i, idx) => (
            


          ))}
        


      


    


  );
};


File location: components/ui/sidebar.tsx

File content: "use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch>;
  animate: boolean;
}

const SidebarContext = createContext(
  undefined
);

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
  open?: boolean;
  setOpen?: React.Dispatch>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    
      {children}
    
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
  setOpen?: React.Dispatch>;
  animate?: boolean;
}) => {
  return (
    
      {children}
    
  );
};

export const SidebarBody = (props: React.ComponentProps) => {
  return (
    <>
      
      )} />
    
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
       setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      
    
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      


        


           setOpen(!open)}
          />
        


        
          {open && (
            
              

 setOpen(!open)}
              >
                
              


              {children}
            
          )}
        
      


    
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  return (
    
      {link.icon}

      
        {link.label}
      
    
  );
};

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/38bdb472-d7a8-4159-b6c9-1a412b26174f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
