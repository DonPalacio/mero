# Constitución de Mero

1. **Stack mínimo.** Solo TanStack Start, Supabase, Tailwind/shadcn y Bun. Una dependencia nueva se justifica en su commit: por qué lo existente no alcanza.
2. **La spec manda.** Todo comportamiento nuevo se describe antes en `docs/specs/`. Si falta una decisión, se detiene el trabajo y se pregunta.
3. **Lógica fuera de la interfaz.** Los `.tsx` solo renderizan; la lógica va en `hooks/` y el acceso a datos en `services/`. Ningún `.tsx` importa `@/lib/supabase`.
4. **Tests en lo que maneja dinero.** Saldos, totales y presupuestos no se dan por terminados sin prueba. Todo cambio pasa `lint`, `tsc --noEmit` y `build` antes de integrarse.
5. **Los datos viven en Postgres.** Supabase con RLS por usuario es la única fuente de verdad. El navegador no guarda datos de negocio ni tokens, y el saldo lo calcula la base de datos. Todo cambio de esquema es una migración.
6. **Idioma.** La nomenclatura (variables, funciones, tipos, archivos, tablas, columnas y funciones SQL) va en inglés. La interfaz, los mensajes de error y los comentarios van en español.
