import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Mobile-first: aviso abajo y centrado, casi a todo el ancho en móvil (16 px de margen,
// respetando el área segura del teléfono). La app es siempre oscura. Los errores usan la
// paleta del ícono de egreso (token destructive): fondo rojo oscuro, texto e ícono en rojo claro.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      richColors
      position="bottom-center"
      offset={16}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)", left: 16, right: 16 }}
      visibleToasts={3}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "color-mix(in oklab, var(--destructive) 30%, var(--background))",
          "--error-text": "var(--destructive)",
          "--error-border": "color-mix(in oklab, var(--destructive) 45%, var(--background))",
          "--border-radius": "var(--radius-2xl)",
        } as CSSProperties
      }
      toastOptions={{
        style: { fontFamily: "inherit" },
        classNames: {
          toast: "shadow-lg text-sm font-medium",
          description: "text-destructive/80",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
