/**
 * Mise en forme des prix, dates et nombres.
 *
 * Les prix sont stockes en centimes de dinar. Chaque fonction accepte une
 * etiquette de langue : le back-office reste en francais, la boutique suit
 * la langue choisie par l'internaute.
 */

import { CURRENCY } from "./constants";

const DEFAULT_TAG = "fr-FR";

/**
 * Le dinar ne s'emploie pas avec ses centimes : les prix s'affichent en unites
 * entieres. Les montants restent malgre tout stockes en centimes, pour que le
 * calcul d'une TVA ou d'une remise ne traine pas d'erreur d'arrondi.
 *
 * En arabe, Intl rend la forme locale attendue (د.ج.) et on la laisse faire.
 * En francais et en anglais il rend le code ISO, "DZD", alors que l'usage
 * algerien ecrit "DA" : on met donc le nombre en forme seul et on ajoute
 * l'abreviation.
 */
export function formatPrice(cents: number, locale: string = DEFAULT_TAG): string {
  const montant = cents / 100;

  if (locale.startsWith("ar")) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(montant)} DA`;
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
