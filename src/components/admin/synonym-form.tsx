"use client";

import { useActionState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";

export function SynonymForm({
  action,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="surface-card space-y-4 p-5 lg:sticky lg:top-24">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Plus className="size-4 text-muted" />
        Ajouter un synonyme
      </h3>

      <div>
        <label htmlFor="term" className="label">
          Terme recherche
        </label>
        <input id="term" name="term" required className="input" placeholder="pc portable" />
        <p className="mt-1 text-xs text-muted-2">
          Normalise automatiquement : accents et majuscules sont ignores.
        </p>
      </div>

      <div>
        <label htmlFor="targets" className="label">
          Remplace par
        </label>
        <input
          id="targets"
          name="targets"
          required
          className="input"
          placeholder="ordinateur portable"
        />
        <p className="mt-1 text-xs text-muted-2">
          Plusieurs termes possibles, separes par des espaces.
        </p>
      </div>

      {state.error && <p className="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-start gap-1.5 rounded-lg bg-success/10 p-2.5 text-xs text-success">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Enregistrer
      </button>
    </form>
  );
}
