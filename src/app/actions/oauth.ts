"use server";

import { redirect } from "next/navigation";
import { redirectLocalized } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clearPending, peekPending } from "@/lib/oauth-state";
import { completeWithEmail } from "@/lib/oauth-link";
import { isProviderId } from "@/lib/oauth";

export type OAuthState = { errorKey?: string };

const emailSchema = z.string().email("invalidEmail");

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
    return { errorKey: "pendingExpired" };
  }

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  const result = await completeWithEmail(pending.provider, pending.profile, parsed.data);
  if (!result.ok) return { errorKey: result.errorKey };

  await clearPending();
  revalidatePath("/", "layout");
  return redirectLocalized(pending.redirectTo || "/compte");
}

export async function cancelSignUpAction() {
  await clearPending();
  return redirectLocalized("/connexion");
}

/** Detache un fournisseur du compte connecte. */
export async function unlinkProviderAction(
  accountId: string
): Promise<{ messageKey: string; tone: "success" | "error" }> {
  const user = await getCurrentUser();
  if (!user) return { messageKey: "sessionExpired", tone: "error" };

  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true, provider: true },
  });

  if (!account || account.userId !== user.id) {
    return { messageKey: "linkNotFound", tone: "error" };
  }

  // Retirer la derniere liaison d'un compte sans mot de passe le rendrait
  // definitivement inaccessible.
  const [remaining, owner] = await Promise.all([
    db.account.count({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);

  if (remaining <= 1 && !owner?.passwordHash) {
    return { messageKey: "lastSignInMethod", tone: "error" };
  }

  await db.account.delete({ where: { id: accountId } });
  revalidatePath("/compte");
  return { messageKey: "linkRemoved", tone: "success" };
}

/** Lie un fournisseur supplementaire au compte deja connecte. */
export async function linkProviderAction(provider: string) {
  const user = await getCurrentUser();
  if (!user) return redirectLocalized("/connexion");
  if (!isProviderId(provider)) return redirectLocalized("/compte");

  // Route technique : elle vit hors du prefixe de langue.
  redirect(`/api/auth/${provider}?redirectTo=/compte`);
}
