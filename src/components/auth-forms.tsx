"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";

export function LoginForm({
  redirectTo,
  children,
}: {
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
        <p className="mt-1.5 text-sm text-muted-2">Accedez a vos commandes et a votre panier.</p>
      </div>

      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <div>
        <label htmlFor="email" className="label">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@exemple.fr"
          className="input"
        />
      </div>

      <PasswordField id="password" label="Mot de passe" autoComplete="current-password" />

      {state.error && <p className="rounded-lg bg-danger/10 p-2.5 text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Se connecter
      </button>

      {children}

      <DemoAccounts />

      <p className="text-center text-sm text-muted-2">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-primary hover:underline">
          Creer un compte
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ children }: { children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Creer un compte</h1>
        <p className="mt-1.5 text-sm text-muted-2">Quelques secondes suffisent.</p>
      </div>

      <div>
        <label htmlFor="name" className="label">
          Nom complet
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Camille Fournier"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@exemple.fr"
          className="input"
        />
      </div>

      <PasswordField
        id="password"
        label="Mot de passe"
        autoComplete="new-password"
        hint="8 caracteres minimum"
      />

      {state.error && <p className="rounded-lg bg-danger/10 p-2.5 text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Creer mon compte
      </button>

      {children}

      <p className="text-center text-xs leading-relaxed text-muted-2">
        En creant un compte, vous acceptez les conditions generales et la politique de
        confidentialite de Pravia.
      </p>

      <p className="text-center text-sm text-muted-2">
        Deja inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Se connecter
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
          className="input pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-2 transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

/** Raccourci de demonstration : pre-remplit le formulaire de connexion. */
function DemoAccounts() {
  function fill(email: string, password: string) {
    const form = document.querySelector("form");
    const emailInput = form?.querySelector<HTMLInputElement>("#email");
    const passwordInput = form?.querySelector<HTMLInputElement>("#password");
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-3">
      <p className="text-xs font-semibold text-muted">Comptes de demonstration</p>
      <div className="mt-2 grid gap-1.5">
        <button
          type="button"
          onClick={() => fill("admin@pravia.com", "admin123")}
          className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-3"
        >
          <span className="font-medium">Administrateur</span>
          <span className="text-muted-2">admin@pravia.com</span>
        </button>
        <button
          type="button"
          onClick={() => fill("camille@exemple.fr", "demo1234")}
          className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-3"
        >
          <span className="font-medium">Client</span>
          <span className="text-muted-2">camille@exemple.fr</span>
        </button>
      </div>
    </div>
  );
}
