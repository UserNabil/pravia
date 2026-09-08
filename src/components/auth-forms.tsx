"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, registerAction, type FormState } from "@/app/actions/auth";

/** Affiche l'echec renvoye par l'action, traduit dans la langue courante. */
function FormError({ state }: { state: FormState }) {
  const t = useTranslations("formErrors");
  if (!state.errorKey) return null;
  return (
    <p className="rounded-lg bg-danger/10 p-2.5 text-sm text-danger">
      {t(state.errorKey, state.values)}
    </p>
  );
}

export function LoginForm({
  redirectTo,
  children,
}: {
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("signInTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-2">{t("signInSubtitle")}</p>
      </div>

      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

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

      <PasswordField id="password" label={t("password")} autoComplete="current-password" />

      <FormError state={state} />

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("submitSignIn")}
      </button>

      {children}

      <p className="text-center text-sm text-muted-2">
        {t("noAccount")}{" "}
        <Link href="/inscription" className="font-medium text-primary hover:underline">
          {t("signUpTitle")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("signUpTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-2">{t("signUpSubtitle")}</p>
      </div>

      <div>
        <label htmlFor="name" className="label">
          {t("fullName")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder={t("namePlaceholder")}
          className="input"
        />
      </div>

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

      <PasswordField
        id="password"
        label={t("password")}
        autoComplete="new-password"
        hint={t("passwordHint")}
      />

      <FormError state={state} />

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("submitSignUp")}
      </button>

      {children}

      <p className="text-center text-xs leading-relaxed text-muted-2">{t("terms")}</p>

      <p className="text-center text-sm text-muted-2">
        {t("hasAccount")}{" "}
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          {t("submitSignIn")}
        </Link>
      </p>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  autoComplete: string;
  hint?: string;
}) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder="********"
          className="input pe-11"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          className="absolute end-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-2 transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

