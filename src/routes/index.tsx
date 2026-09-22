import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  // beforeLoad se ejecuta antes de intentar dibujar la pantalla
  beforeLoad: () => {
    // Lanzamos una redirección automática a tu nueva ruta limpia
    throw redirect({
      to: "/transactions",
    });
  },
  // Como redirigimos inmediatamente, el componente visual puede quedar vacío
  component: () => null,
});
