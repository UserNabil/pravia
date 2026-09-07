"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, X } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/format";
import { FormFeedback } from "./form-feedback";
import { TranslationFields, type TranslationValues } from "./translation-fields";

type Editable = {
  id: string;
  name: string;
  icon?: string;
  accent?: string;
  description?: string | null;
  sortOrder?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noIndex?: boolean;
  translations?: TranslationValues;
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
  const t = useTranslations("admin.taxonomy");
  const [state, formAction, pending] = useActionState(action, {});
  const [icon, setIcon] = useState(editing?.icon ?? "package");
  const [accent, setAccent] = useState(editing?.accent ?? "#64748b");

  return (
    <form action={formAction} className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          {editing ? t("edit") : kind === "category" ? t("newCategory") : t("newBrand")}
        </h2>
        {editing && onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost px-2 py-1 text-xs">
            <X className="size-3.5" />
            {t("cancel")}
          </button>
        )}
      </div>

      <input type="hidden" name="id" value={editing?.id ?? ""} />

      <div>
        <label htmlFor="name" className="label">
          {t("name")} <span className="text-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          defaultValue={editing?.name ?? ""}
          key={editing?.id ?? "new"}
          required
          className="input"
          placeholder={
            kind === "category" ? t("categoryNamePlaceholder") : t("brandNamePlaceholder")
          }
        />
      </div>

      {kind === "category" ? (
        <>
          <div>
            <label htmlFor="description" className="label">
              {t("description")}
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
              rows={2}
              className="input resize-y"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          <div>
            <span className="label">{t("icon")}</span>
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
              {t("sortOrder")}
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={editing?.sortOrder ?? 0}
              className="input"
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              {t("seo")}
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="metaTitle" className="label">
                  {t("metaTitle")}
                </label>
                <input
                  id="metaTitle"
                  name="metaTitle"
                  defaultValue={editing?.metaTitle ?? ""}
                  className="input"
                  placeholder={t("metaTitlePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="metaDescription" className="label">
                  {t("metaDescription")}
                </label>
                <textarea
                  id="metaDescription"
                  name="metaDescription"
                  defaultValue={editing?.metaDescription ?? ""}
                  rows={3}
                  className="input resize-y"
                  placeholder={t("metaDescriptionPlaceholder")}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="noIndex"
                  defaultChecked={editing?.noIndex ?? false}
                  className="size-4 rounded border-border accent-[var(--primary)]"
                />
                {t("noIndex")}
              </label>
            </div>
          </div>

          <TranslationFields
            namespace="admin.taxonomy"
            values={editing?.translations ?? {}}
            fields={[
              { name: "name", label: t("name") },
              { name: "description", label: t("description"), rows: 2 },
              { name: "metaTitle", label: t("metaTitle") },
              { name: "metaDescription", label: t("metaDescription"), rows: 3 },
            ]}
          />
        </>
      ) : (
        <div>
          <label htmlFor="accent" className="label">
            {t("accent")}
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

      <FormFeedback state={state} size="xs" />

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {editing ? t("save") : t("create")}
      </button>
    </form>
  );
}

/** Bouton d'edition : remonte la ligne selectionnee au formulaire. */
export function EditTrigger({ onSelect }: { onSelect: () => void }) {
  const t = useTranslations("admin.taxonomy");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={t("edit")}
      className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      <Pencil className="size-3.5" />
    </button>
  );
}
