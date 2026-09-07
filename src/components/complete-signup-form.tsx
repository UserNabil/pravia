"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { cancelSignUpAction, completeSignUpAction } from "@/app/actions/oauth";

export function CompleteSignUpForm() {
  const [state, action, pending] = useActionState(completeSignUpAction, {});

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-4">
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

        {state.error && (
          <p className="rounded-lg bg-danger/10 p-2.5 text-sm text-danger">{state.error}</p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Terminer mon inscription
        </button>
      </form>

      <form action={cancelSignUpAction}>
        <button type="submit" className="btn btn-ghost w-full text-sm">
          Annuler
        </button>
      </form>
    </div>
  );
}
