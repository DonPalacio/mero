// Colores del gráfico de torta: cada uno con un matiz claramente distinto (azul, turquesa, violeta,
// naranja, rosa, lima y cielo) pero con luminosidad alta y saturación moderada, para que se lean
// suaves sobre el fondo oscuro. Combinan con el verde y el rojo de los estados sin confundirse con
// ellos; el gráfico repite nombre y cifra para que la identidad no dependa solo del color.
export const CHART_COLORS = [
  "oklch(0.78 0.12 265)",
  "oklch(0.8 0.11 185)",
  "oklch(0.78 0.12 310)",
  "oklch(0.8 0.12 55)",
  "oklch(0.8 0.11 355)",
  "oklch(0.84 0.12 120)",
  "oklch(0.82 0.1 235)",
] as const;
