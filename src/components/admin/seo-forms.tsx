"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Globe, Loader2 } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { cn } from "@/lib/format";

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
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(indexable);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Globe className="size-4 text-muted" />
            Identite du site
          </h2>
          <p className="mt-1 text-xs text-muted-2">
            Ces valeurs alimentent les balises de chaque page, le sitemap et les partages sociaux.
          </p>

          <div className="mt-4 space-y-4">
            <Field
              label="Adresse du site"
              name="seo.siteUrl"
              defaultValue={values["seo.siteUrl"]}
              placeholder="https://pravia.com"
              hint="Sert de base aux URL canoniques et au sitemap. Sans elle, rien n'est indexable correctement."
            />
            <Field label="Nom du site" name="seo.siteName" defaultValue={values["seo.siteName"]} />
            <Field
              label="Gabarit de titre"
              name="seo.titleTemplate"
              defaultValue={values["seo.titleTemplate"]}
              hint="%s est remplace par le titre de la page."
            />
            <Counted
              label="Titre par defaut"
              name="seo.defaultTitle"
              defaultValue={values["seo.defaultTitle"]}
              max={60}
            />
            <Counted
              label="Description par defaut"
              name="seo.defaultDescription"
              defaultValue={values["seo.defaultDescription"]}
              max={158}
              textarea
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Organisation</h2>
          <p className="mt-1 text-xs text-muted-2">
            Utilise dans les donnees structurees Organization lues par les moteurs.
          </p>
          <div className="mt-4 space-y-4">
            <Field
              label="Raison sociale"
              name="seo.organizationLegalName"
              defaultValue={values["seo.organizationLegalName"]}
            />
            <Field
              label="Localisation"
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
          <h2 className="text-sm font-bold">Indexation</h2>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="seo.indexable"
              defaultChecked={indexable}
              onChange={(event) => setOpen(event.target.checked)}
              className="mt-0.5 size-4 rounded border-border accent-[var(--primary)]"
            />
            <span>
              <span className="block text-sm font-medium">
                Autoriser les moteurs a indexer le site
              </span>
              <span className="mt-0.5 block text-xs text-muted-2">
                Decochez pendant la recette : robots.txt bloquera tout et le sitemap sera vide.
              </span>
            </span>
          </label>

          {!open && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Le site sera invisible dans les resultats de recherche tant que cette case reste
              decochee.
            </p>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Partage social</h2>
          <div className="mt-4 space-y-4">
            <Field
              label="Image sociale par defaut"
              name="seo.defaultOgImage"
              defaultValue={values["seo.defaultOgImage"]}
              placeholder="/opengraph-image"
              hint="Laisser vide pour utiliser l'image generee automatiquement (1200x630)."
            />
            <Field
              label="Compte X / Twitter"
              name="seo.twitterHandle"
              defaultValue={values["seo.twitterHandle"]}
              placeholder="@pravia"
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Verification de propriete</h2>
          <p className="mt-1 text-xs text-muted-2">
            Collez ici le code fourni par chaque outil pour valider le site.
          </p>
          <div className="mt-4 space-y-4">
            <Field
              label="Google Search Console"
              name="seo.googleVerification"
              defaultValue={values["seo.googleVerification"]}
              placeholder="google-site-verification"
            />
            <Field
              label="Bing Webmaster Tools"
              name="seo.bingVerification"
              defaultValue={values["seo.bingVerification"]}
            />
          </div>
        </section>

        {state.error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}
        {state.success && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Check className="size-4 shrink-0" />
            {state.success}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enregistrer le referencement
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
          label="Titre"
          name="metaTitle"
          defaultValue={page.metaTitle}
          max={60}
          placeholder="Laisser vide pour le titre par defaut"
        />
        <Counted
          label="Description"
          name="metaDescription"
          defaultValue={page.metaDescription}
          max={158}
          textarea
          placeholder="Laisser vide pour la description par defaut"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`freq-${page.path}`} className="label">
            Frequence de mise a jour
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
            Priorite (0 a 1)
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
            Dans le sitemap
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="noIndex"
              defaultChecked={page.noIndex}
              className="size-4 rounded border-border accent-[var(--primary)]"
            />
            Exclure de l&apos;index
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enregistrer
        </button>
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
        {state.success && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-3.5" />
            {state.success}
          </span>
        )}
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
        <span className={cn("text-xs tabular-nums", tone)}>
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
