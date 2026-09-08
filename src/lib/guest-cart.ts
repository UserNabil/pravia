import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "./db";

/**
 * Panier des visiteurs sans compte.
 *
 * Acheter ne demande aucune inscription : le compte ne sert qu'a retrouver ses
 * commandes plus tard. Le panier d'un visiteur tient donc dans un cookie plutot
 * qu'en base — pas de ligne orpheline a purger, et rien a nettoyer quand le
 * visiteur ne revient jamais.
 *
 * Le cookie ne porte que des identifiants de produits et des quantites : le
 * prix, le stock et la disponibilite sont toujours relus en base au moment de
 * l'affichage et de la commande. Un cookie trafique ne peut donc pas fausser un
 * montant, au pire il designe un produit qui sera ecarte.
 */

const COOKIE_NAME = "pravia_cart";

/**
 * Cookie depose apres une commande passee sans compte : il porte
 * l'identifiant de la commande tout juste creee, le temps d'en afficher la
 * confirmation. Sans lui, la page de confirmation serait accessible a qui
 * devinerait un numero, ceux-ci se suivant.
 *
 * Il vit ici plutot que dans le module d'actions : un fichier "use server"
 * ne peut exporter que des fonctions asynchrones, et une constante y annule
 * silencieusement tous les autres exports.
 */
export const LAST_ORDER_COOKIE = "pravia_last_order";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours
/** Garde-fou : un cookie depassant 4 Ko serait rejete par le navigateur. */
const MAX_LINES = 50;

/** Une ligne : un produit, eventuellement une couleur, une quantite. */
export type GuestLine = { productId: string; variantId: string | null; quantity: number };

/** Le cookie n'est marque Secure que si la requete est arrivee en HTTPS. */
async function requestIsSecure(): Promise<boolean> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return process.env.NODE_ENV === "production";
}

export async function readGuestCart(): Promise<GuestLine[]> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) return null;
        const { p, v, q } = entry as { p?: unknown; v?: unknown; q?: unknown };
        if (typeof p !== "string" || !p) return null;
        const quantity = Math.trunc(Number(q));
        if (!Number.isFinite(quantity) || quantity < 1) return null;
        return { productId: p, variantId: typeof v === "string" && v ? v : null, quantity };
      })
      .filter((line): line is GuestLine => line !== null)
      .slice(0, MAX_LINES);
  } catch {
    // Cookie illisible : on repart d'un panier vide plutot que d'echouer.
    return [];
  }
}

export async function writeGuestCart(lines: GuestLine[]): Promise<void> {
  const store = await cookies();

  if (!lines.length) {
    store.delete(COOKIE_NAME);
    return;
  }

  const charge = lines
    .slice(0, MAX_LINES)
    .map((l) => ({ p: l.productId, v: l.variantId ?? undefined, q: l.quantity }));
  store.set(COOKIE_NAME, JSON.stringify(charge), {
    httpOnly: true,
    sameSite: "lax",
    secure: await requestIsSecure(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearGuestCart(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/**
 * Reverse le panier en cookie dans le compte qui vient d'ouvrir une session.
 *
 * Appelee par createSession, donc sur tous les chemins d'entree : connexion,
 * inscription, et chacun des cinq fournisseurs externes. Sans elle, remplir son
 * panier puis se connecter le viderait — le cas le plus courant, puisque c'est
 * justement au moment de payer qu'on pense a se connecter.
 */
export async function mergeGuestCartIntoAccount(userId: string): Promise<void> {
  const lignes = await readGuestCart();
  if (!lignes.length) return;

  const produits = await db.product.findMany({
    where: { id: { in: lignes.map((l) => l.productId) }, active: true },
    select: { id: true, stock: true },
  });
  const stockParId = new Map(produits.map((p) => [p.id, p.stock]));

  for (const ligne of lignes) {
    const stock = stockParId.get(ligne.productId);
    if (!stock) continue;

    const existante = await db.cartItem.findFirst({
      where: { userId, productId: ligne.productId, variantId: ligne.variantId },
    });

    // Les quantites s'additionnent, plafonnees au stock disponible.
    const quantite = Math.min((existante?.quantity ?? 0) + ligne.quantity, stock);

    if (existante) {
      await db.cartItem.update({ where: { id: existante.id }, data: { quantity: quantite } });
    } else {
      await db.cartItem.create({
        data: { userId, productId: ligne.productId, variantId: ligne.variantId, quantity: quantite },
      });
    }
  }

  await clearGuestCart();
}

/**
 * Ajoute ou complete une ligne, sans depasser le stock disponible.
 * Deux couleurs du meme article forment deux lignes distinctes.
 */
export function upsertLine(
  lines: GuestLine[],
  productId: string,
  variantId: string | null,
  quantity: number,
  stock: number
): GuestLine[] {
  const suivantes = [...lines];
  const index = suivantes.findIndex(
    (l) => l.productId === productId && (l.variantId ?? null) === variantId
  );
  const voulu = (index >= 0 ? suivantes[index].quantity : 0) + quantity;
  const retenu = Math.min(Math.max(voulu, 1), stock);

  if (index >= 0) suivantes[index] = { productId, variantId, quantity: retenu };
  else suivantes.push({ productId, variantId, quantity: retenu });

  return suivantes;
}
