// Nitro carga este archivo por su cuenta (además de las opciones de vite.config.ts).
//
// El servidor SSR se empaqueta en UN solo archivo en lugar de varios bloques
// (_ssr/*.mjs y _libs/*.mjs). Con bloques, el empaquetador (rolldown) generó un
// ciclo entre `createServerFn`, `@tanstack/react-router` y `react` que en Vercel
// terminaba en "TypeError: __commonJSMin is not a function" al atender la primera
// petición. Sin bloques no puede haber ciclos entre ellos.
export default {
  inlineDynamicImports: true,
};
