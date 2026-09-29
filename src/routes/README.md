# Routes

TanStack Start usa ruteo basado en archivos. Los archivos de rutas viven en
este directorio y TanStack Router genera el árbol de rutas automáticamente.

No crear `src/pages/`, `src/routes/_app/index.tsx` ni `app/layout.tsx`: son
convenciones de Next.js o Remix y no se usan en este proyecto.

El shell global de la aplicación es `src/routes/__root.tsx`. No crear un
segundo root layout.

## Convenciones

| Archivo                  | URL / comportamiento                                                            |
| ------------------------ | ------------------------------------------------------------------------------- |
| `index.tsx`              | `/`                                                                             |
| `about.tsx`              | `/about`                                                                        |
| `users/index.tsx`        | `/users`                                                                        |
| `users/$id.tsx`          | `/users/:id` — segmento dinámico; usar `$id`, sin llaves                        |
| `posts/{-$category}.tsx` | `/posts/:category?` — segmento opcional                                         |
| `files/$.tsx`            | `/files/*` — splat; leer el valor mediante el parámetro `_splat`, nunca `*`     |
| `_layout.tsx`            | Layout sin segmento en URL; envuelve rutas hijas y debe renderizar `<Outlet />` |
| `__root.tsx`             | Root route / shell global; siempre se renderiza y debe conservar `<Outlet />`   |

## Archivos generados

`src/routeTree.gen.ts` es generado automáticamente por el plugin de TanStack
Router. Nunca editarlo manualmente.

## Reglas al crear rutas

- Consultar las rutas y patrones existentes antes de crear una nueva.
- Usar la convención de nombres de TanStack Router indicada arriba; no adoptar
  convenciones de routing de Next.js, Remix o React Router.
- Si se crea una nueva ruta pública de primer nivel, agregarla a
  `isPublicPage` en `src/routes/__root.tsx`, porque `beforeLoad` aplica el
  guard de autenticación global.
- Mantener `<Outlet />` en `__root.tsx` y en cualquier layout de ruta que
  deba renderizar rutas hijas.
