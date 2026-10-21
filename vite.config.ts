import { defineConfig, loadEnv, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  // Las variables VITE_* se inyectan también en el servidor (SSR/Nitro), no solo en el cliente.
  const envDefine = Object.fromEntries(
    Object.entries(loadEnv(mode, process.cwd(), "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  const config: UserConfig = {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      // Una sola copia de React y de TanStack Query: dos copias rompen los contextos.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        // Redirige el entry de servidor de TanStack Start a src/server.ts (nuestro manejo de errores
        // de SSR). Nitro construye a partir de ahí.
        server: { entry: "server" },
      }),
      // Nitro solo empaqueta el servidor al compilar; en Vercel elige solo su preset.
      ...(command === "build" ? [nitro()] : []),
      viteReact(),
    ],
    server: {
      host: "::",
      port: 8080,
      // Espera a que el archivo termine de escribirse antes de recargar.
      watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
    },
  };

  // `build:dev` empaqueta el cliente en modo desarrollo conservando los nombres de funciones.
  if (command === "build" && mode === "development") {
    config.environments = { client: { define: { "process.env.NODE_ENV": '"development"' } } };
    config.esbuild = { keepNames: true } as NonNullable<UserConfig["esbuild"]>;
  }

  return config;
});
