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