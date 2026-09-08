import "server-only";
import { getLocale } from "next-intl/server";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { formatDate, formatDateTime, formatNumber, formatPrice } from "./format";

/**
 * Pendant serveur de useFormat.
 *
 * Les prix passent tous par formatPrice, jamais par le formateur de next-intl :
 * le dinar s'ecrit "DA" en francais alors qu'Intl rend le code ISO "DZD", et
 * deux chemins de mise en forme finissent toujours par diverger — c'est
 * exactement ce qui a laisse des euros sur les vignettes produits apres le
 * passage au dinar.
 */
export async function getFormat() {
  const tag = LOCALE_TAGS[toLocale(await getLocale())];

  return {
    tag,
    price: (cents: number) => formatPrice(cents, tag),
    date: (value: Date | string) => formatDate(value, tag),
    dateTime: (value: Date | string) => formatDateTime(value, tag),
    number: (value: number) => formatNumber(value, tag),
  };
}
