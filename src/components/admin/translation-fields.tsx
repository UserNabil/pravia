"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { routing, LOCALE_DIRECTION, LOCALE_LABELS, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/format";

export type TranslationValues = Partial<Record<Locale, Record<string, string>>>;

type FieldSpec = {
  /** Nom du champ, tel qu'il sera lu cote serveur : `tr.<langue>.<name>`. */
  name: string;
  label: string;
  rows?: number;
};

/**
 * Onglets de traduction d'un contenu.
 *
 * Toutes les langues sont dans le DOM en permanence : le formulaire envoie
 * l'ensemble en une seule soumission, et changer d'onglet ne perd rien.
 * Un champ laisse vide fait retomber l'affichage sur la version de reference.
 */
export function TranslationFields({
  fields,
  values,
  namespace = "admin.productForm",
}: {
  fields: FieldSpec[];
  values: TranslationValues;
  namespace?: string;
}) {
  const t = useTranslations(namespace);
  // La langue de reference se saisit dans les champs principaux du formulaire.
  const locales = routing.locales.filter((locale) => locale !== routing.defaultLocale);
  const [active, setActive] = useState<Locale>(locales[0]);

  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-bold">{t("translations")}</h2>
      <p className="mt-1 text-xs text-muted-2">{t("translationsHint")}</p>

      <div role="tablist" className="mt-4 flex gap-1.5">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={active === locale}
            onClick={() => setActive(locale)}
            className={cn(
              "chip border transition-colors",
              active === locale
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:text-foreground"
            )}
          >
            {LOCALE_LABELS[locale].name}
          </button>
        ))}
      </div>

      {locales.map((locale) => (
        <div key={locale} hidden={active !== locale} className="mt-4 space-y-4">
          {fields.map((field) => {
            const id = `tr-${locale}-${field.name}`;
            const name = `tr.${locale}.${field.name}`;
            const value = values[locale]?.[field.name] ?? "";
            const dir = LOCALE_DIRECTION[locale];

            return (
              <div key={field.name}>
                <label htmlFor={id} className="label">
                  {field.label}
                </label>
                {field.rows ? (
                  <textarea
                    id={id}
                    name={name}
                    defaultValue={value}
                    rows={field.rows}
                    dir={dir}
                    className="input resize-y"
                  />
                ) : (
                  <input id={id} name={name} defaultValue={value} dir={dir} className="input" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
