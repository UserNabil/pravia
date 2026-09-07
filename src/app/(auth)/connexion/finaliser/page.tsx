import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CompleteSignUpForm } from "@/components/complete-signup-form";
import { ProviderMark } from "@/components/provider-buttons";
import { peekPending } from "@/lib/oauth-state";
import { getProvider } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finaliser votre inscription",
  robots: { index: false, follow: false },
};

/**
 * Etape de finalisation, atteinte lorsqu'un fournisseur ne communique pas
 * d'adresse e-mail. Plutot que d'inventer une adresse factice, on la demande.
 */
export default async function CompleteSignUpPage() {
  const pending = await peekPending();
  if (!pending) redirect("/connexion");

  const provider = getProvider(pending.provider);

  return (
    <div className="space-y-5">
      <div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2">
          <ProviderMark provider={pending.provider} />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Une derniere chose</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {provider.label} ne nous transmet pas votre adresse e-mail. Elle nous est necessaire
          pour vous envoyer vos confirmations de commande et votre suivi de livraison.
        </p>
      </div>

      {pending.profile.name && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm">
          Connecte en tant que <span className="font-semibold">{pending.profile.name}</span>
        </p>
      )}

      <CompleteSignUpForm />
    </div>
  );
}
