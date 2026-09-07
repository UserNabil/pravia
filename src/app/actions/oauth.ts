"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clearPending, peekPending } from "@/lib/oauth-state";
import { completeWithEmail } from "@/lib/oauth-link";
import { isProviderId } from "@/lib/oauth";

export type OAuthState = { error?: string };

const emailSchema = z.string().email("Adresse e-mail invalide");

/**
 * Termine la creation d'un compte pour un fournisseur qui ne communique pas
 * d'adresse e-mail, TikTok en pratique.
 */
export async function completeSignUpAction(
  _prev: OAuthState,
  formData: FormData
): Promise<OAuthState> {
  const pending = await peekPending();
  if (!pending) {
    return { error: "La demande a expire. Relancez la connexion depuis la page de connexion." };
  }

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await completeWithEmail(pending.provider, pending.profile, parsed.data);
  if (!result.ok) return { error: result.error };

  await clearPending();
  revalidatePath("/", "layout");
  redirect(pending.redirectTo || "/compte");
}

export async function cancelSignUpAction() {
  await clearPending();
  redirect("/connexion");
}

/** Detache un fournisseur du compte connecte. */
export async function unlinkProviderAction(
  accountId: string
): Promise<{ message: string; tone: "success" | "error" }> {
  const user = await getCurrentUser();
  if (!user) return { message: "Session expiree.", tone: "error" };

  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true, provider: true },
  });

  if (!account || account.userId !== user.id) {
    return { message: "Liaison introuvable.", tone: "error" };
  }

  // Retirer la derniere liaison d'un compte sans mot de passe le rendrait
  // definitivement inaccessible.
  const [remaining, owner] = await Promise.all([
    db.account.count({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);

  if (remaining <= 1 && !owner?.passwordHash) {
    return {
      message:
        "Impossible de retirer la seule methode de connexion de ce compte. Definissez d'abord un mot de passe.",
      tone: "error",
    };
  }

  await db.account.delete({ where: { id: accountId } });
  revalidatePath("/compte");
  return { message: "Liaison retiree.", tone: "success" };
}

/** Lie un fournisseur supplementaire au compte deja connecte. */
export async function linkProviderAction(provider: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (!isProviderId(provider)) redirect("/compte");

  redirect(`/api/auth/${provider}?redirectTo=/compte`);
}
