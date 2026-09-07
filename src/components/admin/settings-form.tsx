"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";

export function SettingsForm({
  action,
  values,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  values: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">Identite de la boutique</h2>
        <p className="mt-1 text-xs text-muted-2">
          Ces informations apparaissent dans le pied de page et les e-mails.
        </p>

        <div className="mt-4 space-y-4">
          <Field label="Nom" name="store.name" defaultValue={values["store.name"]} />
          <Field label="Accroche" name="store.tagline" defaultValue={values["store.tagline"]} />
          <Field
            label="E-mail de contact"
            name="store.email"
            type="email"
            defaultValue={values["store.email"]}
          />
          <Field label="Telephone" name="store.phone" defaultValue={values["store.phone"]} />
        </div>
      </section>

      <div className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Livraison</h2>
          <p className="mt-1 text-xs text-muted-2">Montants exprimes en centimes d&apos;euro.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Seuil franco de port"
              name="shipping.freeThreshold"
              type="number"
              defaultValue={values["shipping.freeThreshold"]}
              hint="15000 = 150,00 EUR"
            />
            <Field
              label="Frais de port forfaitaires"
              name="shipping.flatRate"
              type="number"
              defaultValue={values["shipping.flatRate"]}
              hint="990 = 9,90 EUR"
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Bandeau promotionnel</h2>
          <p className="mt-1 text-xs text-muted-2">
            Affiche en haut de toutes les pages de la boutique. Laisser vide pour le masquer.
          </p>

          <div className="mt-4">
            <label htmlFor="banner.text" className="label">
              Texte du bandeau
            </label>
            <textarea
              id="banner.text"
              name="banner.text"
              defaultValue={values["banner.text"]}
              rows={2}
              className="input resize-y"
            />
          </div>
        </section>

        {state.error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}
        {state.success && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Check className="size-4" />
            {state.success}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enregistrer les reglages
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
