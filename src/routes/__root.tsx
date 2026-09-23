import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/lib/supabase";
import SidebarDemo from "@/components/Sidebar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function PendingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Se ejecuta antes de cargar CUALQUIER ruta (incluidas las anidadas).
  // Si no hay sesión activa y no está en /login, lo manda a /login.
  // Si ya tiene sesión y trata de entrar a /login, lo manda al home.
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const isAuthenticated = !!data.session;
    const isLoginPage = location.pathname === "/login";

    if (!isAuthenticated && !isLoginPage) {
      throw redirect({ to: "/login" });
    }

    if (isAuthenticated && isLoginPage) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mero" },
      { name: "description", content: "Control de finanzas personales" },
      { name: "author", content: "Mero" },
      { property: "og:title", content: "Mero" },
      { property: "og:description", content: "Control de finanzas personales" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" },

      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },

      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },

      // ELIMINAMOS los favicons genéricos para que no sobreescriban estas reglas:
      {
        rel: "icon",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
        href: "/favicon-black.png?v=3"
      },
      {
        rel: "icon",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
        href: "/favicon-white.png?v=3"
      }
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const router = useRouter();

  const isLoginPage = location.pathname === "/login";

  // Si el usuario hace login/logout en cualquier parte de la app,
  // esto fuerza a re-evaluar el beforeLoad (y por lo tanto redirigir).
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {isLoginPage ? (
        <Outlet />
      ) : (
        <SidebarDemo>
          <Outlet />
        </SidebarDemo>
      )}
    </QueryClientProvider>
  );
}
