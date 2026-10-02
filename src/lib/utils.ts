import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Fecha de hoy en hora LOCAL como "YYYY-MM-DD". No usar toISOString() para esto: devuelve
// la fecha en UTC y, por ejemplo en Colombia (UTC-5), pasa al día siguiente desde las 7 p. m.
export function fechaLocalISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// UUID v4. crypto.randomUUID() solo existe en contextos seguros (HTTPS o localhost); sin él
// (por ejemplo, probando desde el celular por http://192.168.x.x) se arma con getRandomValues.
export function generarUuid(): string {
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
