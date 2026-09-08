"use server";

import { listCommunes } from "@/lib/shipping";

/**
 * Communes d'une wilaya, chargees a la demande.
 *
 * Le pays compte plus de 1600 communes : les envoyer toutes au navigateur
 * alourdirait la page de commande pour rien, alors qu'une seule wilaya est
 * choisie. Le tarif renvoye est celui reellement applicable a la commune,
 * surcharge comprise, pour que le formulaire affiche le bon montant sans
 * refaire la resolution de son cote.
 */
export async function communesForWilayaAction(wilayaCode: number) {
  if (!Number.isInteger(wilayaCode) || wilayaCode < 1 || wilayaCode > 99) return [];
  return listCommunes(wilayaCode);
}
