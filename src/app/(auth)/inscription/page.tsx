import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Creer un compte" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/compte");

  return <RegisterForm />;
}
