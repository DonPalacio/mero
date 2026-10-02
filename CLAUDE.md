# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Restricciones no negociables

### Integración con Lovable y Git

Este proyecto está conectado a [Lovable](https://lovable.dev).

- Nunca ejecutar `git push --force`, `git rebase`, ni `git commit --amend` o squash sobre commits que ya fueron pusheados a la rama conectada.
- No reescribir el historial de la rama conectada: Lovable sincroniza cada commit pusheado y una reescritura puede hacer que el usuario pierda el historial del proyecto.
- Mantener la rama conectada en estado funcional en cada commit pusheado.

### Datos, seguridad y autenticación

- Nunca crear otro cliente con `createClient()` para Supabase.
- Nunca usar `supabase.auth.*` en el cliente de navegador.
- Nunca exponer, persistir en el navegador ni registrar refresh tokens.
- Nunca escribir `medios.saldo` directamente desde la aplicación: el trigger `actualizar_saldo_medio` de la base de datos es su única fuente de actualización.
- No quitar ni omitir `createCsrfMiddleware` en `src/start.ts`. Definir ese archivo desactiva el middleware CSRF automático de TanStack Start.
- No editar manualmente `src/routeTree.gen.ts`; lo genera el plugin de TanStack Router.

## Comandos y validación

El gestor de paquetes es **Bun**. `bunfig.toml` y `bun.lock` están versionados.

`bun.lock` es el único archivo de lock del proyecto: Vercel detecta Bun por él e instala con `bun install` y compila con `bun run build` (verificado en un despliegue de vista previa). No volver a generar un `package-lock.json`: agregar o actualizar dependencias con `bun add`/`bun install`, no con `npm`. Si ese archivo reaparece, Vercel vuelve a instalar con npm y los dos lockfiles se desincronizan. No borrar `bun.lock` sin pedir confirmación.

```bash
bun install         # Instala dependencias.
bun run dev         # Inicia el servidor de desarrollo Vite.
bun run build       # Ejecuta el build de producción con Vite.
bun run build:dev   # Ejecuta el build en modo desarrollo.
bun run preview     # Previsualiza un build de producción.
bun run lint        # Ejecuta ESLint.
bun run format      # Aplica Prettier a todo el repositorio.
```

No existe una suite de pruebas configurada: no hay configuración de Vitest/Jest ni script `test` en `package.json`. No asumir ni intentar ejecutar pruebas inexistentes.

## Aplicación y convenciones de dominio

**Stack confirmado:** TanStack Start con React 19 y SSR, Vite, TanStack Router basado en archivos, TanStack Query, Supabase para Postgres/Auth, Tailwind v4 y shadcn/ui estilo `new-york`.

- Los componentes de shadcn/ui se encuentran en `src/components/ui`.
- El dominio usa español: `movimientos` equivale a transactions; `medios`, a cajas/cuentas; y `categorias`, a categories.
- Mantener el naming y el lenguaje de dominio existentes; no introducir nomenclatura inglesa paralela para entidades ya establecidas.
- `@/*` resuelve a `src/*`; consultar `tsconfig.json` y `components.json`.

Antes de crear una ruta, hook, servicio, query o mutación, inspeccionar los patrones equivalentes existentes y extenderlos en lugar de introducir una estructura paralela.

## Rutas y autorización

El ruteo es basado en archivos bajo `src/routes/`.

- Consultar `src/routes/README.md` antes de crear o renombrar rutas.
- Usar `$id` para segmentos dinámicos, `{-$cat}` para opcionales, `$` para splats y `_layout` para rutas de layout.
- `__root.tsx` es el único shell/layout global de la aplicación. Nunca crear `src/pages/` ni rutas con convenciones de Next.js o Remix.
- `src/routeTree.gen.ts` se genera automáticamente; nunca editarlo manualmente.

`beforeLoad` en `src/routes/__root.tsx` es el guard global de autenticación:

- Llama a `getSessionUser()` en cada navegación, tanto en cliente como en SSR.
- Redirige a usuarios sin sesión a `/login`.
- Mantiene públicas `/login` y `/auth/*`.
- Redirige fuera de `/login` a usuarios que ya tienen sesión.
- Toda nueva ruta pública de primer nivel debe agregarse a la verificación `isPublicPage` de `__root.tsx`.

## Features y acceso a datos

### Estructura de features

Cada feature de dominio vive en `src/features/<feature>/` y sigue este patrón:

- `<Feature>.tsx`: pantalla o componente principal.
- `hooks/use<Feature>.ts`: estado local de UI, coordinación con el servicio y actualización de caché.
- `services/<feature>.service.ts`: wrapper delgado de consultas a Supabase, como un objeto literal de funciones `async`.

Los servicios devuelven datos o `null`/`false` en caso de error, registran el error con `console.error` y no lanzan excepciones, excepto cuando el caller realmente necesite manejar una excepción.

### Supabase

Hay dos clientes y cada uno tiene un único propósito:

- `src/lib/supabase.ts`: cliente del navegador para datos mediante PostgREST/Realtime. No expone `supabase.auth.*`. Solicita un access token de vida corta al servidor mediante `getAccessToken()` y lo conserva solamente en memoria.
- `src/lib/supabase-server.ts`: cliente exclusivo del servidor mediante `createSupabaseServerClient`, usado por server functions y SSR. Gestiona la sesión con cookies HttpOnly mediante `@supabase/ssr`.

Los flujos de autenticación están en `src/features/auth/services/auth.functions.ts`:

- `getSessionUser`
- `getAccessToken`
- `signIn`
- `signUp`
- `signOut`
- `exchangeCode`, para confirmación de correo mediante PKCE

Todos son handlers `createServerFn({ method: "POST" })` intencionalmente. No cambiar estos flujos a `GET`: las respuestas pueden incluir tokens y no deben cachearse.

### Esquema, RLS y saldo

Para reconstruir Supabase de desarrollo, aplicar primero `supabase/schema_base.sql` y luego `supabase/migrations/*.sql`.

- Las tablas `categorias`, `medios` y `movimientos` usan RLS restringido a `auth.uid() = user_id`.
- `medios.saldo` es un valor derivado, mantenido exclusivamente por el trigger `actualizar_saldo_medio` en inserts, updates y deletes de `movimientos`.
- Tras mutar un movimiento, actualizar/refetchear datos de `medios` mediante los helpers de caché. No actualizar `saldo` directamente desde la aplicación.

### React Query

`src/lib/queries.ts` es la única fuente de verdad de query keys y query options para `movimientos`, `medios` y `categorias`.

- Dashboard, movimientos, cajas y categorías comparten esas claves para reutilizar datos en navegación.
- El `staleTime` es de 5 minutos y está configurado en `src/router.tsx`.
- Después de mutaciones, usar los helpers exportados por `src/lib/queries.ts`: `movimientoCreado`, `movimientoEliminado` y `catalogoModificado`.
- No crear `setQueryData` ni `invalidateQueries` ad hoc o en línea para estos recursos; los helpers preservan la consistencia de `medios.saldo`, que se deriva en la base de datos.

## SSR, despliegue y servidor

Leer los comentarios inline antes de modificar cualquiera de estos archivos.

- `vite.config.ts` debe permanecer mínimo. `@lovable.dev/vite-tanstack-config` ya configura TanStack Devtools, `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, `nitro`, inyección de variables `VITE_*`, alias `@`, deduplicación de React/TanStack, error logger y detección de sandbox. No agregar esos plugins manualmente: duplicarlos rompe la configuración.
- `nitro.config.ts` configura `inlineDynamicImports: true` para empaquetar SSR en un único archivo. No eliminarlo: evita un ciclo de módulos entre `createServerFn`, `@tanstack/react-router` y React que causaba `__commonJSMin is not a function` en la primera petición de Vercel.
- `src/server.ts` envuelve el server entry de TanStack Start para detectar respuestas donde h3 absorbe silenciosamente un error y devuelve un JSON 500 genérico. En ese caso, se renderiza `src/lib/error-page.ts`. Conservar este comportamiento.
- `src/start.ts` define `requestMiddleware` con manejo de errores y `createCsrfMiddleware`. Mantener ambos mecanismos.

## Convenciones de código de servidor

`eslint.config.js` prohíbe importar `server-only`, que es una convención de Next.js y no se utiliza en este proyecto.

Para marcar código exclusivo de servidor, usar archivos `*.server.ts` o `@tanstack/react-start/server-only`.