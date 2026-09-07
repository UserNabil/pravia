"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { cancelSignUpAction, completeSignUpAction } from "@/app/actions/oauth";

export function CompleteSignUpForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("formErrors");
  const [state, action, pending] = useActionState(completeSignUpAction, {});

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            className="input"
            dir="ltr"
          />
        </div>

        {state.errorKey && (
          <p className="rounded-lg bg-danger/10 p-2.5 text-sm text-danger">{tErrors(state.errorKey)}</p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("completeSubmit")}
        </button>
      </form>

      <form action={cancelSignUpAction}>
        <button type="submit" className="btn btn-ghost w-full text-sm">
          {tCommon("cancel")}
        </button>
      </form>
    </div>
  );
}
