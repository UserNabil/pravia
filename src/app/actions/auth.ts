"use server";

import { redirectLocalized } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type FormState = { errorKey?: string; values?: Record<string, string | number> };

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  microsoft: "Microsoft",
  facebook: "Facebook",
  tiktok: "TikTok",
  apple: "Apple",
};

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#a855f7", "#14b8a6"];

const loginSchema = z.object({
  email: z.string().email("invalidEmail"),
  password: z.string().min(1, "passwordRequired"),
});

const registerSchema = z.object({
  name: z.string().min(2, "nameTooShort"),
  email: z.string().email("invalidEmail"),
  password: z.string().min(8, "passwordTooShort"),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { errorKey: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    include: { accounts: { select: { provider: true } } },
  });

  // Un compte cree par connexion externe n'a pas de mot de passe : on l'oriente
  // vers le bon bouton plutot que de lui opposer un echec incomprehensible.
  if (user && !user.passwordHash) {
    const providers = user.accounts.map((a) => PROVIDER_LABELS[a.provider] ?? a.provider);
    return providers.length
      ? { errorKey: "usesProvider", values: { providers: providers.join(" / ") } }
      : { errorKey: "noPassword" };
  }

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash!))) {
    return { errorKey: "badCredentials" };
  }

  await createSession(user.id);

  const raw = String(formData.get("redirectTo") ?? "");
  // On n'accepte qu'un chemin interne, jamais une URL absolue.
  const target = raw.startsWith("/") && !raw.startsWith("//") ? raw : user.role === "ADMIN" ? "/admin" : "/compte";

  revalidatePath("/", "layout");
  return redirectLocalized(target);
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { errorKey: parsed.error.issues[0].message };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { errorKey: "emailTaken" };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });

  await createSession(user.id);
  revalidatePath("/", "layout");
  return redirectLocalized("/compte");
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  return redirectLocalized("/");
}
