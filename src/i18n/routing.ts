import { defineRouting } from "next-intl/routing";

/**
 * Trois langues, toutes prefixees dans l'URL : /fr, /en, /ar.
 *
 * Le prefixe systematique evite les pieges d'un contenu different sous une
 * meme adresse : chaque version a son URL propre, indexable et partageable,
 * et les balises hreflang se construisent sans ambiguite.
 */
export const routing = defineRouting({
  locales: ["fr", "en", "ar"],
  defaultLocale: "fr",
  localePrefix: "always",
  // La langue choisie est memorisee un an dans un cookie.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

/** Sens d'ecriture : l'arabe se lit de droite a gauche. */
export const LOCALE_DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  fr: "ltr",
  en: "ltr",
  ar: "rtl",
};

/** Libelles affiches dans le selecteur, chacun dans sa propre langue. */
export const LOCALE_LABELS: Record<Locale, { name: string; short: string }> = {
  fr: { name: "Francais", short: "FR" },
  en: { name: "English", short: "EN" },
  ar: { name: "العربية", short: "ع" },
};

/** Etiquette de langue complete, pour Intl et l'attribut lang. */
export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-MA",
};

/**
 * Next type le parametre de route en `string` : cette fonction le ramene au
 * type Locale apres verification, plutot que de forcer la conversion.
 */
export function toLocale(value: string): Locale {
  return (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;
}

/**
 * Prefixe un chemin interne par la langue.
 * Les adresses absolues sont laissees intactes.
 */
export function localePath(locale: Locale, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}
