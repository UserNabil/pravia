import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth-forms";
import { ProviderButtons } from "@/components/provider-buttons";
import { getCurrentUser } from "@/lib/auth";
import { configuredProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle") };
}

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) return redirectLocalized("/compte");

  const t = await getTranslations("auth");

  return (
    <RegisterForm>
      <ProviderButtons providers={configuredProviders()} action={t("signUpWith")} />
    </RegisterForm>
  );
}
