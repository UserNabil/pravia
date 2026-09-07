"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/format";

type Editable = {
  id: string;
  name: string;
  icon?: string;
  accent?: string;
  description?: string | null;
  sortOrder?: number;
};

/** Formulaire de creation / edition partage par les categories et les marques. */
export function TaxonomyForm({
  action,
  kind,
  editing,
  onCancel,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  kind: "category" | "brand";
  editing: Editable | null;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [icon, setIcon] = useState(editing?.icon ?? "package");
  const [accent, setAccent] = useState(editing?.accent ?? "#64748b");

  return (
    <form action={formAction} className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          {editing ? "Modifier" : kind === "category" ? "Nouvelle categorie" : "Nouvelle marque"}
        </h2>
        {editing && onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost px-2 py-1 text-xs">
            <X className="size-3.5" />
            Annuler
          </button>
        )}
      </div>

      <input type="hidden" name="id" value={editing?.id ?? ""} />

      <div>
        <label htmlFor="name" className="label">
          Nom <span className="text-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          defaultValue={editing?.name ?? ""}
          key={editing?.id ?? "new"}
          required
          className="input"
          placeholder={kind === "category" ? "Smartphones" : "Apple"}
        />
      </div>

      {kind === "category" ? (
        <>
          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
              rows={2}
              className="input resize-y"
              placeholder="Affichee sur la page de la categorie."
            />
          </div>

          <div>
            <span className="label">Icone</span>
            <input type="hidden" name="icon" value={icon} />
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORY_ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  aria-label={name}
                  aria-pressed={icon === name}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                    icon === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2 text-muted hover:text-foreground"
                  )}
                >
                  <CategoryIcon name={name} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sortOrder" className="label">
              Ordre d&apos;affichage
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={editing?.sortOrder ?? 0}
              className="input"
            />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="accent" className="label">
            Couleur d&apos;accent
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="accent"
              name="accent"
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="h-9 w-14 cursor-pointer rounded-lg border border-border bg-surface-2 p-1"
            />
            <span className="text-xs tabular-nums text-muted-2">{accent}</span>
          </div>
        </div>
      )}

      {state.error && <p className="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 rounded-lg bg-success/10 p-2.5 text-xs text-success">
          <Check className="size-3.5" />
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {editing ? "Enregistrer" : "Creer"}
      </button>
    </form>
  );
}

/** Bouton d'edition : remonte la ligne selectionnee au formulaire. */
export function EditTrigger({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Modifier"
      className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      <Pencil className="size-3.5" />
    </button>
  );
}
