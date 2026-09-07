"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Globe, Loader2 } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { cn } from "@/lib/format";
import { FormFeedback } from "./form-feedback";

/* --------------------------------------------------------- reglages globaux */

export function SeoSettingsForm({
  action,
  values,
  indexable,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  values: Record<string, string>;
  indexable: boolean;
}) {
  const t = useTranslations("admin.seo");
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(indexable);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Globe className="size-4 text-muted" />
            {t("identity")}
          </h2>
          <p className="mt-1 text-xs text-muted-2">{t("identityHint")}</p>

          <div className="mt-4 space-y-4">
            <Field
              label={t("siteUrl")}
              name="seo.siteUrl"
              defaultValue={values["seo.siteUrl"]}
              placeholder="https://pravia.com"
              hint={t("siteUrlHint")}
            />
            <Field label={t("siteName")} name="seo.siteName" defaultValue={values["seo.siteName"]} />
            <Field
              label={t("titleTemplate")}
              name="seo.titleTemplate"
              defaultValue={values["seo.titleTemplate"]}
              hint={t("titleTemplateHint")}
            />
            <Counted
              label={t("defaultTitle")}
              name="seo.defaultTitle"
              defaultValue={values["seo.defaultTitle"]}
              max={60}
            />
            <Counted
              label={t("defaultDescription")}
              name="seo.defaultDescription"
              defaultValue={values["seo.defaultDescription"]}
              max={158}
              textarea
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("organization")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("organizationHint")}</p>
          <div className="mt-4 space-y-4">
            <Field
              label={t("legalName")}
              name="seo.organizationLegalName"
              defaultValue={values["seo.organizationLegalName"]}
            />
            <Field
              label={t("address")}
              name="seo.organizationAddress"
              defaultValue={values["seo.organizationAddress"]}
              placeholder="Paris, France"
            />
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section
          className={cn(
            "surface-card p-5",
            !open && "border-warning/40 bg-warning/5"
          )}
        >
          <h2 className="text-sm font-bold">{t("indexing")}</h2>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="seo.indexable"
              defaultChecked={indexable}
              onChange={(event) => setOpen(event.target.checked)}
              className="mt-0.5 size-4 rounded border-border accent-[var(--primary)]"
            />
            <span>
              <span className="block text-sm font-medium">{t("allowIndexing")}</span>
              <span className="mt-0.5 block text-xs text-muted-2">{t("allowIndexingHint")}</span>
            </span>
          </label>

          {!open && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {t("indexingWarning")}
            </p>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("social")}</h2>
          <div className="mt-4 space-y-4">
            <Field
              label={t("defaultOgImage")}
              name="seo.defaultOgImage"
              defaultValue={values["seo.defaultOgImage"]}
              placeholder="/opengraph-image"
              hint={t("defaultOgImageHint")}
            />
            <Field
              label={t("twitterHandle")}
              name="seo.twitterHandle"
              defaultValue={values["seo.twitterHandle"]}
              placeholder="@pravia"
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("verification")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("verificationHint")}</p>
          <div className="mt-4 space-y-4">
            <Field
              label={t("google")}
              name="seo.googleVerification"
              defaultValue={values["seo.googleVerification"]}
              placeholder="google-site-verification"
            />
            <Field
              label={t("bing")}
              name="seo.bingVerification"
              defaultValue={values["seo.bingVerification"]}
            />
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

/* ------------------------------------------------------------- page unitaire */

export type SeoPageRow = {
  path: string;
  label: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  noIndex: boolean;
  inSitemap: boolean;
  changeFrequency: string;
  priority: number;
};

const FREQUENCIES = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

export function SeoPageForm({
  action,
  page,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  page: SeoPageRow;
}) {
  const t = useTranslations("admin.seo");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="surface-card p-5">
      <input type="hidden" name="path" value={page.path} />
      <input type="hidden" name="label" value={page.label} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{page.label}</h3>
        <code className="text-xs text-muted-2">{page.path}</code>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Counted
          label={t("pageTitle")}
          name="metaTitle"
          defaultValue={page.metaTitle}
          max={60}
          placeholder={t("pageTitlePlaceholder")}
        />
        <Counted
          label={t("pageDescription")}
          name="metaDescription"
          defaultValue={page.metaDescription}
          max={158}
          textarea
          placeholder={t("pageDescriptionPlaceholder")}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`freq-${page.path}`} className="label">
            {t("changeFrequency")}
          </label>
          <select
            id={`freq-${page.path}`}
            name="changeFrequency"
            defaultValue={page.changeFrequency}
            className="input"
          >
            {FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`prio-${page.path}`} className="label">
            {t("priority")}
          </label>
          <input
            id={`prio-${page.path}`}
            name="priority"
            type="number"
            min="0"
            max="1"
            step="0.1"
            defaultValue={page.priority}
            className="input"
          />
        </div>

        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="inSitemap"
              defaultChecked={page.inSitemap}
              className="size-4 rounded border-border accent-[var(--primary)]"
            />
            {t("inSitemap")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="noIndex"
              defaultChecked={page.noIndex}
              className="size-4 rounded border-border accent-[var(--primary)]"
            />
            {t("noIndex")}
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("save")}
        </button>
        <FormFeedback state={state} size="xs" />
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- champs */

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input"
      />
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

/** Champ avec compteur de caracteres et alerte au-dela de la limite conseillee. */
function Counted({
  label,
  name,
  defaultValue,
  max,
  textarea = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  max: number;
  textarea?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const length = value.length;
  const tone =
    length === 0
      ? "text-muted-2"
      : length > max
        ? "text-danger"
        : length < max * 0.5
          ? "text-warning"
          : "text-success";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="label">
          {label}
        </label>
        <span className={cn("text-xs tabular-nums", tone)} dir="ltr">
          {length} / {max}
        </span>
      </div>

      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="input resize-y"
        />
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="input"
        />
      )}
    </div>
  );
}
