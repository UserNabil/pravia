"use server";

import { redirectLocalized } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { AdminState } from "./admin";

/**
 * Grille des frais de livraison.
 *
 * Un tarif par wilaya, qu'une commune peut surcharger quand elle coute plus
 * cher a desservir. Les montants sont saisis en dinars entiers dans le
 * back-office et stockes en centimes, comme tous les autres montants.
 */

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return redirectLocalized("/connexion?redirectTo=/admin/livraison");
  }
  return user;
}

function refresh(code?: number) {
  revalidatePath("/admin/livraison");
  if (code) revalidatePath(`/admin/livraison/${code}`);
  // Le panier, la fiche produit et la commande annoncent des frais : ils
  // doivent refleter la nouvelle grille sans attendre.
  revalidatePath("/", "layout");
}

const dinars = z.coerce
  .number()
  .int("feeInvalid")
  .min(0, "feeInvalid")
  .max(100000, "feeInvalid");

/** Enregistre en une fois les tarifs saisis sur la liste des wilayas. */
export async function saveWilayaFeesAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();

  const actives = new Set(formData.getAll("active").map(String));
  const modifications: { code: number; shippingFee: number; active: boolean }[] = [];

  for (const [cle, valeur] of formData.entries()) {
    const correspondance = /^fee-(\d+)$/.exec(cle);
    if (!correspondance) continue;

    const code = Number(correspondance[1]);
    const parsed = dinars.safeParse(valeur);
    if (!parsed.success) return { errorKey: "feeInvalid", values: { wilaya: code } };

    modifications.push({
      code,
      shippingFee: parsed.data * 100,
      active: actives.has(String(code)),
    });
  }

  if (!modifications.length) return { errorKey: "nothingToSave" };

  await db.$transaction(
    modifications.map((m) =>
      db.wilaya.update({
        where: { code: m.code },
        data: { shippingFee: m.shippingFee, active: m.active },
      })
    )
  );

  refresh();
  return { successKey: "feesSaved", values: { count: modifications.length } };
}

/**
 * Surcharges d'une wilaya : un champ vide remet la commune sur le tarif de sa
 * wilaya, plutot que d'y inscrire zero — qui signifierait « livraison offerte ».
 */
export async function saveCommuneFeesAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();

  const code = Number(formData.get("wilayaCode"));
  if (!Number.isInteger(code)) return { errorKey: "wilayaUnknown" };

  const misesAJour: { id: string; shippingFee: number | null }[] = [];

  for (const [cle, valeur] of formData.entries()) {
    const correspondance = /^commune-(.+)$/.exec(cle);
    if (!correspondance) continue;

    const texte = String(valeur).trim();
    if (!texte) {
      misesAJour.push({ id: correspondance[1], shippingFee: null });
      continue;
    }

    const parsed = dinars.safeParse(texte);
    if (!parsed.success) return { errorKey: "feeInvalid" };
    misesAJour.push({ id: correspondance[1], shippingFee: parsed.data * 100 });
  }

  if (!misesAJour.length) return { errorKey: "nothingToSave" };

  await db.$transaction(
    misesAJour.map((m) =>
      db.commune.update({ where: { id: m.id }, data: { shippingFee: m.shippingFee } })
    )
  );

  refresh(code);
  return { successKey: "feesSaved", values: { count: misesAJour.length } };
}
