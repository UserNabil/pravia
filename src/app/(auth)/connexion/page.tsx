import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { LoginForm } from "@/components/auth-forms";
import { ProviderButtons } from "@/components/provider-buttons";
import { getCurrentUser } from "@/lib/auth";
import { configuredProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connexion" };

/** Messages associes aux echecs possibles d'une connexion externe. */
const ERREURS: Record<string, string> = {
  annule: "Connexion annulee. Vous pouvez reessayer quand vous le souhaitez.",
  "session-expiree": "La demande a expire. Relancez la connexion.",
  "etat-invalide": "La demande n'a pas pu etre verifiee. Relancez la connexion.",
  "code-absent": "Le fournisseur n'a renvoye aucun code d'autorisation.",
  "echec-fournisseur": "Le fournisseur a refuse la connexion. Reessayez ou utilisez votre mot de passe.",
  "refus-fournisseur": "Le fournisseur a refuse la demande.",
  "fournisseur-inconnu": "Ce mode de connexion n'existe pas.",
  "non-configure": "Ce mode de connexion n'est pas encore active sur ce site.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; erreur?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/compte");

  const { redirectTo, erreur } = await searchParams;
  const providers = configuredProviders();
  const message = erreur ? (ERREURS[erreur] ?? "La connexion n'a pas abouti.") : null;

  return (
    <div className="space-y-4">
      {message && (
        <p className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      )}

      <LoginForm redirectTo={redirectTo}>
        <ProviderButtons providers={providers} redirectTo={redirectTo} action="Continuer avec" />
      </LoginForm>
    </div>
  );
}
