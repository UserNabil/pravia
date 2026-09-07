/**
 * Mise en forme des prix, dates et nombres.
 *
 * Les prix sont stockes en centimes d'euro. Chaque fonction accepte une
 * etiquette de langue : le back-office reste en francais, la boutique suit
 * la langue choisie par l'internaute.
 */

const DEFAULT_TAG = "fr-FR";

export function formatPrice(cents: number, locale: string = DEFAULT_TAG): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(date: Date | string, locale: string = DEFAULT_TAG): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = DEFAULT_TAG): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatNumber(n: number, locale: string = DEFAULT_TAG): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
