# CLAUDE.md - Mero

## ¿Qué es el proyecto?

Mero es una app de finanzas personales en español, instalable como PWA, donde cada usuario registra ingresos y gastos por medio (caja o cuenta) y categoría, y ve un dashboard con totales mensuales, gráficos y presupuestos. Es una aplicación full-stack con SSR en TanStack Start (React 19, Vite, Nitro) que organiza el código por features (routes/, features/<x>/{hooks,services}, lib/queries.ts como fuente única del caché de TanStack Query). Usa Supabase (Postgres con RLS por user_id y un trigger que mantiene boxes.balance), con la sesión en cookies HttpOnly manejadas por el servidor y el navegador accediendo a datos con un token de vida corta en memoria. La interfaz usa Tailwind v4 y shadcn/ui, y el proyecto se despliega en Vercel con CSP y cabeceras de seguridad, con GitHub Actions como CI (lint, tsc, build) y Bun como gestor de paquetes.

## Comandos

Gestor de paquetes: **Bun**. `bun.lock` es el único lockfile.

```bash
bun install            # Instala dependencias.
bun run dev            # Servidor de desarrollo (Vite).
bun run build          # Build de producción (el que ejecuta Vercel).
bun run build:dev      # Build en modo desarrollo.
bun run preview        # Previsualiza un build de producción.
bun run lint           # Ejecuta ESLint.
bun run format         # Aplica Prettier a todo el repositorio.
bunx tsc --noEmit      # Chequeo de tipos (no es script de package.json; lo ejecuta el CI).
bun add <paquete>      # Agrega o actualiza dependencias. Nunca con npm.
```

### Validación (CI)

El CI corre en cada PR y en cada push a `main`:

```bash
bun install --frozen-lockfile
bun run lint
bunx tsc --noEmit
bun run build
```

## Estilos y convenciones

- **Formato:** Prettier (100 columnas, comillas dobles, punto y coma, `trailingComma: "all"`) a través de ESLint. Se aplica con `bun run format`.
- **TypeScript:** `strict`, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. Los imports usan el alias `@/*` y, dentro de una feature, rutas relativas.
- **Idioma:** la nomenclatura (variables, funciones, tipos, archivos, tablas, columnas, funciones SQL y valores de dato) va en **inglés**. UI, toasts, mensajes de error y comentarios van en español; los comentarios explican el *por qué*. Nombres del dominio: `transactions`, `boxes` (cajas), `categories`, `yields`.
- **Feature:** `<Feature>.tsx` (solo UI), `hooks/use<Feature>.ts` (estado y caché) y `services/<feature>.service.ts` (objeto literal con funciones `async` en inglés (`getBoxes`, `createBox`)).
- **Hooks de una feature grande:** si `use<Feature>.ts` crece, se divide en `hooks/` por responsabilidad y el principal queda como orquestador con la misma API (ejemplo: `useTransactions.ts` compone `useTransactionMonths.ts`, `useTransactionForm.ts` y `useRowHorizontalScrollForwarding.ts`). Las claves de mes se arman con `toMonthKey` de `queries.ts`, no a mano.
- **Servicios:** las lecturas lanzan error (lo maneja React Query) y las escrituras devuelven `{ ok, motivo }`.
- **Caché:** las claves y queries viven solo en `src/lib/queries.ts`. Tras mutar se usan sus helpers, con actualización optimista y `toast.error("No se pudo …")` si falla.
- **UI:** Tailwind v4 con tokens semánticos (`bg-card`, `text-muted-foreground`) y shadcn/ui en `src/components/ui`. Iconos con Tabler en las pantallas y Lucide solo en `ui/`. Toasts con `sonner`.
- **Tarjetas del Dashboard:** las superficies usan las utilidades de `src/styles.css` (`fn-card`, `fn-chip`, `fn-icon-button`, `fn-input`, `fn-button`, `fn-button-soft`, `fn-button-danger`) y los tokens `fn-*` (`bg-fn-card`, `text-fn-muted`, `bg-fn-brand`), que reutilizan `--background`, `--card` y `--border`; estados con `text-success`, `text-warning`, `text-negative`, siempre con ícono o texto. Movimiento corto y solo `transform`/`opacity`/`clip-path` (`dash-enter`, `bar-rise`, `fill-reveal`), con `prefers-reduced-motion`. Cifras animadas con `AnimatedNumber` (`src/components`); entrada de tarjetas con `dash-enter` y `[--i:N]`.
- **Servidor:** `*.server.ts` o `@tanstack/react-start/server-only`. Nunca `server-only`.
- **Cierre de sesión:** `src/lib/signing-out.ts` guarda el estado "saliendo" y `AppShell` (`components/Sidebar.tsx`) deja de dibujar contenido privado mientras dura. `useLogout` lo activa y `RootComponent` lo quita cuando `/login` ya está en pantalla (no antes: reaparecería la pantalla anterior).
- **Precarga tras el login:** `signIn`/`signUp` devuelven el token de acceso (solo en memoria, con `setAccessToken`) y `useAuth` precarga el dashboard con `prefetchScreen`. `useRoutePreload` (en `AppShell`) descarga el código de las demás pantallas privadas cuando no quedan consultas en curso; si se agrega una pantalla al menú, hay que sumarla a su lista.
- **Saltos de línea:** `.gitattributes` fija LF en el repositorio.

## Reglas

### Git

- Lee `docs/constitution.md` y la spec activa en `docs/specs/` antes de tocar código.
- No modifiques archivos dentro de `docs/specs/` salvo petición explícita.
- Nunca `git push --force`, `git rebase`, `git commit --amend` ni squash sobre commits ya pusheados.
- No reescribir el historial de `main`.
- Mantener `main` funcional en cada commit pusheado.

### Seguridad y autenticación

- Nunca crear otro cliente con `createClient()` para Supabase. Solo existen `src/lib/supabase.ts` (navegador, datos) y `src/lib/supabase-server.ts` (servidor, sesión).
- Nunca usar `supabase.auth.*` en el navegador.
- Nunca exponer, persistir en el navegador ni registrar refresh tokens. El access token vive solo en memoria.
- Los flujos de `auth.functions.ts` son `createServerFn({ method: "POST" })` a propósito: no cambiarlos a `GET`.
- No quitar `createCsrfMiddleware` ni el `requestMiddleware` de `src/start.ts`. Definir ese archivo desactiva el CSRF automático.
- No relajar la CSP ni las cabeceras de `vercel.json` sin avisar.

### Base de datos

- Nunca escribir `boxes.balance` desde la app: solo lo actualiza el trigger `update_box_balance`.
- `categories`, `boxes`, `transactions` y `yields` usan RLS con `auth.uid() = user_id`. Toda tabla nueva debe llevar RLS y `user_id`.
- Todo cambio de esquema va en un archivo nuevo de `supabase/migrations/`. Las migraciones existentes no se editan.

### Caché

- No crear `setQueryData` ni `invalidateQueries` en línea para `transactions`, `boxes` o `categories`: usar los helpers de `src/lib/queries.ts`.

### Rutas

- Consultar `src/routes/README.md` antes de crear o renombrar rutas.
- Nunca crear `src/pages/` ni convenciones de Next.js o Remix. `__root.tsx` es el único shell.
- Nunca editar `src/routeTree.gen.ts`.
- Toda ruta pública nueva de primer nivel se agrega a `isPublicPage` en `__root.tsx`.

### Dependencias y configuración

- Solo Bun. Nunca `npm` ni un `package-lock.json`. No borrar `bun.lock` sin confirmar.
- `vite.config.ts` declara los plugins de forma explícita (Tailwind, rutas de `tsconfig`, TanStack Start, Nitro solo al compilar y React). No duplicar plugins ni reintroducir un wrapper de configuración.
- No quitar `inlineDynamicImports: true` de `nitro.config.ts`.
- Conservar el manejo de errores de `src/server.ts`.
- No importar `server-only`: ESLint lo prohíbe.

### Pruebas

- No existe suite de pruebas. No asumirlas ni intentar ejecutarlas.

## Al terminar cualquier tarea

1. **Explicar primero lo realizado**, antes de ejecutar cualquier verificación, respondiendo:
   - **Cómo:** qué se hizo y con qué enfoque (archivos y piezas tocadas).
   - **Por qué:** la razón de ese enfoque y las alternativas descartadas, si las hubo.
   - **Para qué:** el problema que resuelve o el resultado que se espera.

2. **Validar** (lo mismo que ejecuta el CI) y corregir lo que falle:
   ```bash
   bun run lint
   bunx tsc --noEmit
   bun run build
   ```
   Si algo falla, no darlo por terminado.

3. **Probar a mano** el flujo afectado con `bun run dev`, porque no hay pruebas automáticas. Si el cambio toca saldos, comprobar que `boxes.balance` se actualiza tras crear, editar y borrar un movimiento.

4. **Revisar el diff**: sin código muerto, sin `console.log` de depuración y sin cambios fuera del alcance de la tarea. Los archivos generados (`routeTree.gen.ts`) no se tocan a mano.

5. **Cambios de base de datos**: dejarlos en un archivo nuevo de `supabase/migrations/`. Avisar que hay que aplicarlo en Supabase, porque no se aplica solo.

6. **Dependencias**: si se agregó alguna, usar `bun add` y confirmar que `bun.lock` quedó actualizado.

7. **Git**:
   - Commit y push solo si se piden.
   - Mensajes de commit en español, siguiendo el estilo del historial (`feat(db):`, `perf(dashboard):`, `feat(security):`).
   - Nunca reescribir commits ya pusheados.

8. **Informar el resultado de las verificaciones**: qué se validó, qué se probó a mano y qué no pudo verificarse. Si algo falló, mostrar la salida real.

9. **Actualizar este `CLAUDE.md`** si la tarea cambió una convención, un comando o una restricción.