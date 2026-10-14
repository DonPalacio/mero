// Tasa diaria equivalente a una tasa E.A. (en %): (1 + EA/100)^(1/365) − 1.
// Es la misma fórmula que usa la BD (credit_yields); aquí solo sirve para ESTIMAR en
// pantalla. El rendimiento real lo acredita la base de datos.
export function dailyRate(eaRate: number): number {
  return Math.pow(1 + eaRate / 100, 1 / 365) - 1;
}

// Estimado de lo que rinde un saldo en un día (0 si no hay tasa o el saldo no es positivo).
export function estimatedDailyYield(balance: number, eaRate: number | null): number {
  if (!eaRate || eaRate <= 0 || balance <= 0) return 0;
  return balance * dailyRate(eaRate);
}

// El rendimiento de un día es pequeño (centavos o pocos pesos): se muestra con 2 decimales,
// a diferencia de fmt() que redondea a pesos enteros.
export function formatYield(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface BoxEditPlan {
  nameChanged: boolean;
  rateChanged: boolean;
  // true cuando la caja ya rinde y el usuario movió el inicio hacia atrás (la BD acredita los
  // días anteriores). Mover el inicio hacia adelante no es un cambio: ya está acreditado.
  fromChanged: boolean;
  // true cuando la caja pasa de no rendir a rendir: solo entonces tiene sentido la fecha de inicio.
  activating: boolean;
}

// Decide qué cambió al confirmar la edición de una caja. Pura: no lee ni escribe nada fuera de
// sus argumentos, así el hook solo ejecuta los efectos (red y caché) que ella indica.
export function planBoxEdit(
  current: { name: string; ea_rate: number | null; yield_from: string | null },
  typedName: string,
  newRate: number | null,
  typedFrom: string,
): BoxEditPlan {
  const rateChanged = newRate !== current.ea_rate;
  const activating = rateChanged && newRate !== null && current.ea_rate === null;
  return {
    nameChanged: typedName.trim() !== current.name,
    rateChanged,
    // Las fechas ISO "YYYY-MM-DD" se ordenan igual como texto que como fecha.
    fromChanged:
      !activating &&
      newRate !== null &&
      current.yield_from !== null &&
      typedFrom !== "" &&
      typedFrom < current.yield_from,
    activating,
  };
}

// Convierte lo escrito por el usuario ("9,30", "9.3", "") en una tasa válida.
// Vacío = sin rendimiento (null). `undefined` = valor inválido. Rango permitido: 0–100.
export function parseEaRate(text: string): number | null | undefined {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return undefined;
  const parsedValue = Number(cleaned);
  if (!Number.isFinite(parsedValue) || parsedValue > 100) return undefined;
  return parsedValue === 0 ? null : parsedValue;
}
