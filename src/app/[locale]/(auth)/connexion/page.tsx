import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { LoginForm } from "@/components/auth-forms";
import { ProviderButtons } from "@/components/provider-buttons";
import { getCurrentUser } from "@/lib/auth";
import { configuredProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle") };
}

/** Codes d'echec renvoyes par le rappel OAuth, traduits cote catalogue. */
const ERROR_KEYS = [
  "annule",
  "session-expiree",
  "etat-invalide",
  "code-absent",
  "echec-fournisseur",
  "refus-fournisseur",
  "fournisseur-inconnu",
  "non-configure",
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; erreur?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) return redirectLocalized(user.role === "ADMIN" ? "/admin" : "/compte");

  const [{ redirectTo, erreur }, t, tErrors] = await Promise.all([
    searchParams,
    getTranslations("auth"),
    getTranslations("authErrors"),
  ]);

  const providers = configuredProviders();
  const message = erreur
    ? tErrors((ERROR_KEYS as readonly string[]).includes(erreur) ? erreur : "generic")
    : null;

  return (
    <div className="space-y-4">
      {message && (
        <p className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      )}

      <LoginForm redirectTo={redirectTo}>
        <ProviderButtons providers={providers} redirectTo={redirectTo} action={t("continueWith")} />
      </LoginForm>
    </div>
  );
}
