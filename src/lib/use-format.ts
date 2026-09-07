"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { formatDate, formatDateTime, formatNumber, formatPrice } from "./format";

/**
 * Mise en forme liee a la langue affichee.
 *
 * Les composants clients n'ont pas acces aux parametres de route : ils lisent
 * la langue depuis le fournisseur next-intl, ce qui evite d'avoir a la faire
 * descendre en propriete a travers tout l'arbre.
 */
export function useFormat() {
  const tag = LOCALE_TAGS[toLocale(useLocale())];

  return useMemo(
    () => ({
      tag,
      price: (cents: number) => formatPrice(cents, tag),
      date: (value: Date | string) => formatDate(value, tag),
      dateTime: (value: Date | string) => formatDateTime(value, tag),
      number: (value: number) => formatNumber(value, tag),
    }),
    [tag]
  );
}
