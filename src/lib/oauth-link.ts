import "server-only";
import { db } from "./db";
import { createSession } from "./auth";
import type { ExternalProfile, ProviderId } from "./oauth";

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#a855f7", "#14b8a6"];

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/** Nom de repli lorsqu'un fournisseur n'en communique aucun. */
function fallbackName(profile: ExternalProfile, provider: ProviderId): string {
  if (profile.name) return profile.name;
  if (profile.email) return profile.email.split("@")[0];
  return `Membre ${provider}`;
}

export type SignInOutcome =
  | { status: "connected"; userId: string }
  | { status: "needs-email" };

/**
 * Rattache un profil externe a un compte Pravia, puis ouvre la session.
 *
 * Trois cas se presentent :
 *   1. la liaison existe deja : on met a jour et on connecte ;
 *   2. l'adresse est verifiee et correspond a un compte : on lie les deux ;
 *   3. sinon on cree un compte, a condition de disposer d'une adresse.
 *
 * Le rattachement par e-mail exige une adresse verifiee par le fournisseur.
 * Sans cette precaution, quiconque creerait un compte externe portant
 * l'adresse d'un client prendrait la main sur son compte Pravia.
 */
export async function signInWithProfile(
  provider: ProviderId,
  profile: ExternalProfile
): Promise<SignInOutcome> {
  const existing = await db.account.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
    select: { id: true, userId: true },
  });

  if (existing) {
    await db.account.update({
      where: { id: existing.id },
      data: {
        lastLoginAt: new Date(),
        email: profile.email,
        displayName: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });
    await createSession(existing.userId);
    return { status: "connected", userId: existing.userId };
  }

  const email = profile.email?.toLowerCase() ?? null;

  if (email && profile.emailVerified) {
    const owner = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (owner) {
      await db.account.create({
        data: {
          userId: owner.id,
          provider,
          providerAccountId: profile.providerAccountId,
          email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
      await createSession(owner.id);
      return { status: "connected", userId: owner.id };
    }
  }

  // Sans adresse utilisable, le compte ne peut pas etre cree : l'appelant
  // redirigera vers la page de finalisation.
  if (!email) return { status: "needs-email" };

  // Adresse deja prise par un compte, mais non verifiee par le fournisseur :
  // on refuse le rattachement automatique et on demande une autre adresse.
  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { status: "needs-email" };

  const user = await db.user.create({
    data: {
      email,
      name: fallbackName(profile, provider),
      avatarColor: randomColor(),
      accounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
          email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      },
    },
  });

  await createSession(user.id);
  return { status: "connected", userId: user.id };
}

/** Cree le compte une fois l'adresse fournie par l'internaute. */
export async function completeWithEmail(
  provider: ProviderId,
  profile: ExternalProfile,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();

  const taken = await db.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (taken) {
    return {
      ok: false,
      error:
        "Un compte existe deja avec cette adresse. Connectez-vous avec votre mot de passe, puis liez ce fournisseur depuis votre compte.",
    };
  }

  const user = await db.user.create({
    data: {
      email: normalized,
      name: fallbackName(profile, provider),
      avatarColor: randomColor(),
      accounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
          email: normalized,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      },
    },
  });

  await createSession(user.id);
  return { ok: true };
}
