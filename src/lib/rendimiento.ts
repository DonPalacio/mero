// Tasa diaria equivalente a una tasa E.A. (en %): (1 + EA/100)^(1/365) − 1.
// Es la misma fórmula que usa la BD (acreditar_rendimientos); aquí solo sirve para ESTIMAR en
// pantalla. El rendimiento real lo acredita la base de datos.
export function tasaDiaria(tasaEa: number): number {
  return Math.pow(1 + tasaEa / 100, 1 / 365) - 1;
}

// Estimado de lo que rinde un saldo en un día (0 si no hay tasa o el saldo no es positivo).
export function rendimientoDiarioEstimado(saldo: number, tasaEa: number | null): number {
  if (!tasaEa || tasaEa <= 0 || saldo <= 0) return 0;
  return saldo * tasaDiaria(tasaEa);
}

// El rendimiento de un día es pequeño (centavos o pocos pesos): se muestra con 2 decimales,
// a diferencia de fmt() que redondea a pesos enteros.
export function formatearRendimiento(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

export interface PlanEdicionMedio {
  nombreCambio: boolean;
  tasaCambio: boolean;
  // true cuando la caja ya rinde y el usuario movió el inicio hacia atrás (la BD acredita los
  // días anteriores). Mover el inicio hacia adelante no es un cambio: ya está acreditado.
  desdeCambio: boolean;
  // true cuando la caja pasa de no rendir a rendir: solo entonces tiene sentido la fecha de inicio.
  activando: boolean;
}

// Decide qué cambió al confirmar la edición de una caja. Pura: no lee ni escribe nada fuera de
// sus argumentos, así el hook solo ejecuta los efectos (red y caché) que ella indica.
export function planearEdicionMedio(
  actual: { nombre: string; tasa_ea: number | null; rendimiento_desde: string | null },
  nombreEscrito: string,
  tasaNueva: number | null,
  desdeEscrito: string,
): PlanEdicionMedio {
  const tasaCambio = tasaNueva !== actual.tasa_ea;
  const activando = tasaCambio && tasaNueva !== null && actual.tasa_ea === null;
  return {
    nombreCambio: nombreEscrito.trim() !== actual.nombre,
    tasaCambio,
    // Las fechas ISO "YYYY-MM-DD" se ordenan igual como texto que como fecha.
    desdeCambio:
      !activando &&
      tasaNueva !== null &&
      actual.rendimiento_desde !== null &&
      desdeEscrito !== "" &&
      desdeEscrito < actual.rendimiento_desde,
    activando,
  };
}

// Convierte lo escrito por el usuario ("9,30", "9.3", "") en una tasa válida.
// Vacío = sin rendimiento (null). `undefined` = valor inválido. Rango permitido: 0–100.
export function parsearTasaEa(texto: string): number | null | undefined {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(limpio)) return undefined;
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor > 100) return undefined;
  return valor === 0 ? null : valor;
}
