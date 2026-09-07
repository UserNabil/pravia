"use client";

import { useActionState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";

export function CreateUserPanel({
  action,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="surface-card space-y-4 p-5 xl:sticky xl:top-24">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <UserPlus className="size-4 text-muted" />
        Creer un compte
      </h2>

      <div>
        <label htmlFor="new-name" className="label">
          Nom complet
        </label>
        <input id="new-name" name="name" required className="input" placeholder="Camille Fournier" />
      </div>

      <div>
        <label htmlFor="new-email" className="label">
          Adresse e-mail
        </label>
        <input
          id="new-email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="camille@exemple.fr"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="label">
          Mot de passe
        </label>
        <input
          id="new-password"
          name="password"
          type="text"
          required
          minLength={8}
          className="input"
          placeholder="8 caracteres minimum"
        />
        <p className="mt-1 text-xs text-muted-2">
          Communiquez-le au titulaire du compte, il pourra le changer.
        </p>
      </div>

      <div>
        <label htmlFor="new-role" className="label">
          Role
        </label>
        <select id="new-role" name="role" defaultValue="CUSTOMER" className="input">
          <option value="CUSTOMER">Client</option>
          <option value="ADMIN">Administrateur</option>
        </select>
      </div>

      {state.error && <p className="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 rounded-lg bg-success/10 p-2.5 text-xs text-success">
          <Check className="size-3.5" />
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Creer le compte
      </button>
    </form>
  );
}
