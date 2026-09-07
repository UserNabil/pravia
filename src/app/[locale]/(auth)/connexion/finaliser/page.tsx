import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompleteSignUpForm } from "@/components/complete-signup-form";
import { ProviderMark } from "@/components/provider-buttons";
import { peekPending } from "@/lib/oauth-state";
import { getProvider } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("completeTitle"), robots: { index: false, follow: false } };
}

/**
 * Etape de finalisation, atteinte lorsqu'un fournisseur ne communique pas
 * d'adresse e-mail. Plutot que d'inventer une adresse factice, on la demande.
 */
export default async function CompleteSignUpPage() {
  const pending = await peekPending();
  if (!pending) return redirectLocalized("/connexion");

  const provider = getProvider(pending.provider);
  const t = await getTranslations("auth");

  return (
    <div className="space-y-5">
      <div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2">
          <ProviderMark provider={pending.provider} />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("completeTitle")}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {t("completeText", { provider: provider.label })}
        </p>
      </div>

      {pending.profile.name && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm">
          {t.rich("completeSignedInAs", {
            name: pending.profile.name,
            strong: (chunks) => <span className="font-semibold">{chunks}</span>,
          })}
        </p>
      )}

      <CompleteSignUpForm />
    </div>
  );
}
