"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cleAccueil, estChampAccueil } from "@/lib/home-content";
import { toLocale } from "@/i18n/routing";

/** De quoi ecrire une accroche, pas un article : la banniere a une place finie. */
const LONGUEUR_MAX = 400;

/**
 * Enregistre un texte de la banniere d'accueil.
 *
 * L'edition se fait depuis la boutique elle-meme, ou n'importe qui peut
 * appeler l'action : le role est donc verifie ici, et le champ confronte a la
 * liste blanche pour qu'un appel forge ne puisse pas ecrire un reglage
 * quelconque.
 */
export async function enregistrerTexteAccueil(
  champ: string,
  langue: string,
  valeur: string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { ok: false };
  if (!estChampAccueil(champ)) return { ok: false };

  const key = cleAccueil(champ, toLocale(langue));
  const texte = valeur.trim().slice(0, LONGUEUR_MAX);

  // Un champ vide n'enregistre pas une chaine vide : il efface la reecriture,
  // et le texte d'origine du catalogue reprend sa place.
  if (!texte) {
    await db.setting.deleteMany({ where: { key } });
  } else {
    await db.setting.upsert({
      where: { key },
      update: { value: texte },
      create: { key, value: texte },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
