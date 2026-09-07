"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserPlus } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { FormFeedback } from "./form-feedback";

export function CreateUserPanel({
  action,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
}) {
  const t = useTranslations("admin.customers");
  const tAuth = useTranslations("auth");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="surface-card space-y-4 p-5 xl:sticky xl:top-24">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <UserPlus className="size-4 text-muted" />
        {t("panelTitle")}
      </h2>

      <div>
        <label htmlFor="new-name" className="label">
          {t("name")}
        </label>
        <input
          id="new-name"
          name="name"
          required
          className="input"
          placeholder={tAuth("namePlaceholder")}
        />
      </div>

      <div>
        <label htmlFor="new-email" className="label">
          {t("email")}
        </label>
        <input
          id="new-email"
          name="email"
          type="email"
          required
          className="input"
          placeholder={tAuth("emailPlaceholder")}
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="label">
          {t("password")}
        </label>
        <input
          id="new-password"
          name="password"
          type="text"
          required
          minLength={8}
          className="input"
          placeholder={t("passwordHint")}
          dir="ltr"
        />
        <p className="mt-1 text-xs text-muted-2">{t("panelIntro")}</p>
      </div>

      <div>
        <label htmlFor="new-role" className="label">
          {t("role")}
        </label>
        <select id="new-role" name="role" defaultValue="CUSTOMER" className="input">
          <option value="CUSTOMER">{t("roleCustomer")}</option>
          <option value="ADMIN">{t("roleAdmin")}</option>
        </select>
      </div>

      <FormFeedback state={state} size="xs" />

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("submit")}
      </button>
    </form>
  );
}
