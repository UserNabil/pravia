import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, LOCALE_TAGS } from "./routing";

/** Charge le catalogue de messages de la langue demandee. */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Les prix et les dates suivent les conventions du pays, pas seulement
    // celles de la langue.
    formats: {
      dateTime: {
        short: { day: "2-digit", month: "short", year: "numeric" },
        long: { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
      },
      number: {
        currency: { style: "currency", currency: "EUR" },
      },
    },
    timeZone: "Europe/Paris",
    onError(error) {
      // Une cle manquante ne doit pas faire tomber la page : elle est signalee
      // dans les journaux et remplacee par son identifiant.
      if (process.env.NODE_ENV !== "production") console.warn("[i18n]", error.message);
    },
    getMessageFallback({ key }) {
      return key;
    },
  };
});
