import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { ProviderButtons } from "@/components/provider-buttons";
import { getCurrentUser } from "@/lib/auth";
import { configuredProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Creer un compte" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/compte");

  return (
    <RegisterForm>
      <ProviderButtons providers={configuredProviders()} action="S'inscrire avec" />
    </RegisterForm>
  );
}
