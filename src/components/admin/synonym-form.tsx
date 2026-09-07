"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { FormFeedback } from "./form-feedback";

export function SynonymForm({
  action,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
}) {
  const t = useTranslations("admin.synonyms");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="surface-card space-y-4 p-5 lg:sticky lg:top-24">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Plus className="size-4 text-muted" />
        {t("add")}
      </h3>

      <div>
        <label htmlFor="term" className="label">
          {t("term")}
        </label>
        <input id="term" name="term" required className="input" placeholder={t("termPlaceholder")} />
        <p className="mt-1 text-xs text-muted-2">
          {t("termHint")}
        </p>
      </div>

      <div>
        <label htmlFor="targets" className="label">
          {t("targets")}
        </label>
        <input
          id="targets"
          name="targets"
          required
          className="input"
          placeholder={t("targetsPlaceholder")}
        />
        <p className="mt-1 text-xs text-muted-2">
          {t("targetsHint")}
        </p>
      </div>

      <FormFeedback state={state} size="xs" />

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("submit")}
      </button>
    </form>
  );
}
