"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { routing, LOCALE_LABELS } from "@/i18n/routing";
import { FormFeedback } from "./form-feedback";

export function SettingsForm({
  action,
  values,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  values: Record<string, string>;
}) {
  const t = useTranslations("admin.settingsForm");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{t("identity")}</h2>
        <p className="mt-1 text-xs text-muted-2">{t("identityHint")}</p>

        <div className="mt-4 space-y-4">
          <Field label={t("name")} name="store.name" defaultValue={values["store.name"]} />
          <Field label={t("tagline")} name="store.tagline" defaultValue={values["store.tagline"]} />
          <Field
            label={t("email")}
            name="store.email"
            type="email"
            defaultValue={values["store.email"]}
          />
          <Field label={t("phone")} name="store.phone" defaultValue={values["store.phone"]} />
        </div>
      </section>

      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("shipping")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("shippingHint")}</p>

          {/* Les frais eux-memes se reglent par wilaya dans Ventes > Livraison :
              il ne reste ici que le seuil au-dela duquel ils sont offerts. */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("freeThreshold")}
              name="shipping.freeThreshold"
              type="number"
              defaultValue={values["shipping.freeThreshold"]}
              hint={t("freeThresholdHint")}
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("banner")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("bannerHint")}</p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="banner.text" className="label">
                {t("bannerText")}
              </label>
              <textarea
                id="banner.text"
                name="banner.text"
                defaultValue={values["banner.text"]}
                rows={2}
                className="input resize-y"
              />
            </div>

            {/* Une declinaison par langue ; vide, la boutique reprend le texte ci-dessus. */}
            {routing.locales.map((locale) => (
              <div key={locale}>
                <label htmlFor={`banner.text.${locale}`} className="label">
                  {t("bannerTextLocale", { locale: LOCALE_LABELS[locale].name })}
                </label>
                <textarea
                  id={`banner.text.${locale}`}
                  name={`banner.text.${locale}`}
                  defaultValue={values[`banner.text.${locale}`]}
                  rows={2}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  className="input resize-y"
                />
              </div>
            ))}
            <p className="text-xs text-muted-2">{t("bannerLocaleHint")}</p>
          </div>
        </section>

        <FormFeedback state={state} size="sm" />

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("submit")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue} className="input" />
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}
