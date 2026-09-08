import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { readGuestCart, writeGuestCart } from "./guest-cart";
import { getCartWithProducts } from "./queries";
import { resolveProduct, translationFilter } from "./content";
import type { Locale } from "@/i18n/routing";

/**
 * Panier courant, que le visiteur ait un compte ou non.
 *
 * Les pages et les actions passent par ici plutot que d'interroger CartItem :
 * acheter ne demande aucune inscription, et le panier d'un visiteur sans compte
 * vit dans un cookie. Les deux sources rendent la meme forme, si bien que
 * l'affichage n'a pas a savoir laquelle a servi.
 *
 * L'identifiant de ligne expose est celui du produit dans les deux cas : c'est
 * la seule cle dont dispose un panier en cookie, et elle suffit au panier en
 * base puisqu'un produit n'y figure qu'une fois.
 */

export type CartLine = Awaited<ReturnType<typeof getGuestCart>>["items"][number];

/** Panier d'un visiteur sans compte, reconstitue depuis le cookie. */
async function getGuestCart(locale: Locale = "fr") {
  const lignes = await readGuestCart();
  if (!lignes.length) return { items: [], subtotal: 0, count: 0 };

  const produits = await db.product.findMany({
    where: { id: { in: lignes.map((l) => l.productId) }, active: true },
    include: {
      brand: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      translations: translationFilter(locale),
    },
  });

  const parId = new Map(produits.map((p) => [p.id, p]));

  // Un produit retire du catalogue ou epuise depuis l'ajout disparait du
  // panier, et le cookie est reecrit pour ne pas trainer la ligne morte.
  const retenues = lignes
    .filter((l) => parId.has(l.productId))
    .map((l) => {
      const produit = parId.get(l.productId)!;
      return { ...l, quantity: Math.min(l.quantity, produit.stock) };
    })
    .filter((l) => l.quantity > 0);

  if (retenues.length !== lignes.length) await writeGuestCart(retenues);

  const items = retenues.map((l) => ({
    id: l.productId,
    quantity: l.quantity,
    product: resolveProduct(parId.get(l.productId)!),
  }));

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, subtotal, count };
}

export async function getCurrentCart(locale: Locale = "fr") {
  const user = await getCurrentUser();
  if (!user) return getGuestCart(locale);

  const { items, subtotal, count } = await getCartWithProducts(user.id, locale);
  // On expose l'identifiant de produit, comme pour un panier en cookie.
  return { items: items.map((i) => ({ ...i, id: i.productId })), subtotal, count };
}

export async function getCurrentCartCount(): Promise<number> {
  const user = await getCurrentUser();

  if (!user) {
    const lignes = await readGuestCart();
    return lignes.reduce((sum, l) => sum + l.quantity, 0);
  }

  const result = await db.cartItem.aggregate({ where: { userId: user.id }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
