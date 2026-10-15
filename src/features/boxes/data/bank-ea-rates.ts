// Tasas de referencia de ahorro de entidades de Colombia, solo para orientar al elegir el E.A.
// de una caja. Son valores publicados por cada entidad (el máximo que anuncia para cuentas de
// ahorro, bolsillos o cajitas), no una promesa: cambian con frecuencia y dependen del saldo y de las
// condiciones del producto. Al actualizarlos, cambia también BANK_EA_RATES_CHECKED_ON.
export interface BankEaRate {
  bank: string;
  // Tasa E.A. máxima anunciada, en porcentaje (13 = 13,00 %).
  maxRate: number;
  // Producto de ahorro al que corresponde la tasa y su condición principal.
  product: string;
}

// Fecha (YYYY-MM-DD) en que se contrastaron las tasas con las páginas oficiales.
export const BANK_EA_RATES_CHECKED_ON = "2026-10-15";

export const BANK_EA_RATES: readonly BankEaRate[] = [
  {
    bank: "Banco AV Villas",
    maxRate: 13,
    product: "Bolsillos con rentabilidad · mínimo $500 mil y cumplir el plazo",
  },
  {
    bank: "Banco de Occidente",
    maxRate: 10.5,
    product: "KUBO Rentable · 9,50 % hasta $20 millones de saldo",
  },
  {
    bank: "Banco Caja Social",
    maxRate: 9.75,
    product: "Alcancía Digital · sin retiros en el mes",
  },
  {
    bank: "Banco Popular",
    maxRate: 9.5,
    product: "Bolsillos de Cuenta Nómina y Cuenta Pensión",
  },
  {
    bank: "Nu Colombia",
    maxRate: 9.35,
    product: "Cajitas · tasa que muestra la app de Nu",
  },
  {
    bank: "Davivienda",
    maxRate: 8.25,
    product: "Bolsillos de Cuenta Nómina, Pensión y Rural · desde $10 millones",
  },
];

const rateFormat = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// "Hasta 13,00%": siempre con 2 decimales y coma decimal.
export function formatBankRate(rate: number): string {
  return `Hasta ${rateFormat.format(rate)}%`;
}

// "15 de octubre de 2026" a partir de "2026-10-15" (sin pasar por Date: evita corrimientos de zona).
export function formatCheckedOn(isoDate: string): string {
  const [year = "", month = "1", day = ""] = isoDate.split("-");
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${Number(day)} de ${monthNames[Number(month) - 1] ?? ""} de ${year}`;
}
