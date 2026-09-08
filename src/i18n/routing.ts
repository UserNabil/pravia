import { defineRouting } from "next-intl/routing";

/**
 * Trois langues, toutes prefixees dans l'URL : /ar, /fr, /en.
 *
 * L'arabe est la langue par defaut : la boutique s'adresse d'abord au public
 * algerien. Une visite de la racine aboutit donc sur /ar, et c'est cette
 * version que les moteurs retiennent comme reference.
 *
 * Le prefixe systematique evite les pieges d'un contenu different sous une
 * meme adresse : chaque version a son URL propre, indexable et partageable,
 * et les balises hreflang se construisent sans ambiguite.
 */
export const routing = defineRouting({
  locales: ["ar", "fr", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  // La langue choisie est memorisee un an dans un cookie.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

/** Sens d'ecriture : l'arabe se lit de droite a gauche. */
export const LOCALE_DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
};

/** Libelles affiches dans le selecteur, chacun dans sa propre langue. */
export const LOCALE_LABELS: Record<Locale, { name: string; short: string }> = {
  ar: { name: "العربية", short: "ع" },
  fr: { name: "Francais", short: "FR" },
  en: { name: "English", short: "EN" },
};

/** Etiquette de langue complete, pour Intl et l'attribut lang. */
export const LOCALE_TAGS: Record<Locale, string> = {
  // ar-DZ plutot que ar-MA : chiffres latins, comme en Algerie, et noms de mois
  // algeriens (septembre s'y dit سبتمبر, non شتنبر).
  ar: "ar-DZ",
  fr: "fr-FR",
  en: "en-GB",
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
