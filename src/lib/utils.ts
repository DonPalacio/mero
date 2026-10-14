import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Los montos admiten hasta 3 decimales (la misma precisión que el % E.A.).
export const MAX_DECIMALS = 3;

const integerFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: MAX_DECIMALS,
});

// Un monto entero se muestra sin decimales ("$ 1.500"); uno con decimales, con al menos 2 y
// hasta 3 ("$ 1.500,50" / "$ 1.500,505"). Se redondea a 3 antes de decidir, para que el ruido
// de la suma de decimales en coma flotante (0,1 + 0,2) no los haga aparecer.
export function fmt(amount: number): string {
  const factor = 10 ** MAX_DECIMALS;
  const rounded = Math.round(amount * factor) / factor;
  return Number.isInteger(rounded) ? integerFormat.format(rounded) : decimalFormat.format(rounded);
}

// Convierte el monto escrito con formato es-CO ("1.500,505": punto de miles y coma decimal) en
// número. `undefined` si no es un número válido o tiene más de 3 decimales.
export function parseAmount(text: string): number | undefined {
  const cleaned = text.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,3})?$/.test(cleaned)) return undefined;
  const parsedValue = Number(cleaned);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

// Da formato al monto mientras se escribe: punto de miles y coma decimal ("10000" → "10.000",
// "1500,5" → "1.500,5"), con hasta 3 decimales. `anterior` es lo que había en el campo:
//  - un "." tecleado justo al final de un número sin coma es el separador decimal ("10." → "10,");
//  - cualquier otro punto (los de miles que se reponen solos, o uno pegado) se descarta;
//  - al borrar, el formato se rehace sobre los dígitos que quedan ("10.000" → "1.000").
// Así lo que se ve es siempre un monto válido y no se puede teclear algo que luego se rechace.
export function formatTypedAmount(text: string, previous = ""): string {
  const decimalPoint =
    text === `${previous}.` && previous !== "" && !previous.includes(",") && text.length > 1;
  const base = decimalPoint ? `${previous},` : text;

  const validOnly = base.replace(/[^\d,]/g, "");
  const i = validOnly.indexOf(",");
  const rawIntegerPart = i === -1 ? validOnly : validOnly.slice(0, i);
  // Sin ceros a la izquierda ("007" → "7"); una coma al inicio queda como "0,".
  const integerPart = rawIntegerPart.replace(/^0+(?=\d)/, "");
  const grouped = (integerPart === "" && i !== -1 ? "0" : integerPart).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );

  if (i === -1) return grouped;
  const decimals = validOnly
    .slice(i + 1)
    .replace(/,/g, "")
    .slice(0, MAX_DECIMALS);
  return `${grouped},${decimals}`;
}

// Fecha de hoy en hora LOCAL como "YYYY-MM-DD". No usar toISOString() para esto: devuelve
// la fecha en UTC y, por ejemplo en Colombia (UTC-5), pasa al día siguiente desde las 7 p. m.
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// UUID v4. crypto.randomUUID() solo existe en contextos seguros (HTTPS o localhost); sin él
// (por ejemplo, probando desde el celular por http://192.168.x.x) se arma con getRandomValues.
export function generateUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // versión 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

export function monthLabelText(monthKey: string): string {
  const [year = 0, month = 1] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1);
  const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getMonthAbbr(monthKey: string): string {
  const [year = 0, month = 1] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3).toUpperCase();
}
