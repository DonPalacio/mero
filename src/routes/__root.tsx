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
import { getSessionUser } from "@/features/auth/services/auth.functions";
import SidebarDemo from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

// El destino de ?redirect= viene de la URL, así que solo se acepta una ruta interna: debe
// empezar con una sola "/" y no llevar "\" ni caracteres de control (los navegadores los
// normalizan y "/\sitio.com" o "/\t/sitio.com" terminarían en otro dominio).
function rutaInternaSegura(destino: string | null): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//")) return "/";
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(destino)) return "/";
  return destino;
}

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

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
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
  // El tipo de retorno se declara explícito: sin él, la validación de "serializable" de
  // TanStack (SSR) lo infiere de forma circular y lo reduce a `never`.
  beforeLoad: async ({
    location,
  }): Promise<{ user: { id: string; email: string | null } | null }> => {
    // La sesión vive en cookies HttpOnly: se valida en el servidor, tanto en SSR
    // como en navegaciones del cliente (server function).
    const user = await getSessionUser();
    const isLoginPage = location.pathname === "/login";
    // /auth/callback debe ser accesible sin sesión (confirmación de correo)
    const isPublicPage = isLoginPage || location.pathname.startsWith("/auth/");

    if (!user && !isPublicPage) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    if (user && isLoginPage) {
      const params = new URLSearchParams(location.searchStr);
      throw redirect({ href: rutaInternaSegura(params.get("redirect")) });
    }

    return { user };
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
      { name: "color-scheme", content: "dark" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
      {
        rel: "icon",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
        href: "/favicon-black.png?v=3",
      },
      {
        rel: "icon",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
        href: "/favicon-white.png?v=3",
      },
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

  const isLoginPage = location.pathname === "/login";

  return (
    <QueryClientProvider client={queryClient}>
      {isLoginPage ? (
        <Outlet />
      ) : (
        <SidebarDemo>
          <Outlet />
        </SidebarDemo>
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
