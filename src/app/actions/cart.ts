"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readGuestCart, writeGuestCart, upsertLine } from "@/lib/guest-cart";

/**
 * Les actions renvoient une cle de message plutot qu'un texte : c'est le
 * composant client qui la traduit, dans la langue de la page. Le serveur n'a
 * ainsi jamais a deviner la langue de l'appelant.
 *
 * Toutes designent une ligne par son identifiant de produit, jamais par la
 * ligne de panier elle-meme : un visiteur sans compte n'a pas de ligne en base,
 * son panier tenant dans un cookie. Le meme appel vaut donc dans les deux cas.
 */
export type ActionResult = {
  ok: boolean;
  messageKey: string;
  values?: Record<string, string | number>;
  requiresAuth?: boolean;
};

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/panier");
}

/** Etat du produit necessaire a toute decision d'ajout ou de mise a jour. */
async function loadProduct(productId: string) {
  return db.product.findUnique({
    where: { id: productId },
    select: { stock: true, active: true, title: true, minOrder: true },
  });
}

export async function addToCartAction(
  productId: string,
  quantity = 1,
  variantId?: string | null
): Promise<ActionResult> {
  const product = await loadProduct(productId);
  if (!product || !product.active) return { ok: false, messageKey: "productUnavailable" };

  // La couleur choisie porte son propre stock : c'est lui qui fait foi.
  const variante = variantId
    ? await db.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true, stock: true, name: true },
      })
    : null;

  if (variantId && !variante) return { ok: false, messageKey: "variantUnavailable" };

  const stock = variante ? variante.stock : product.stock;
  const cle = variante?.id ?? null;

  const demande = Math.max(quantity, product.minOrder);
  const user = await getCurrentUser();

  if (!user) {
    const lignes = await readGuestCart();
    const dejaLa =
      lignes.find((l) => l.productId === productId && (l.variantId ?? null) === cle)?.quantity ?? 0;

    if (dejaLa + demande > stock) {
      return stock === 0
        ? { ok: false, messageKey: "outOfStock" }
        : { ok: false, messageKey: "stockLimited", values: { count: stock } };
    }

    await writeGuestCart(upsertLine(lignes, productId, cle, demande, stock));
    refresh();
    return { ok: true, messageKey: "addedToCart", values: { title: product.title } };
  }

  // Pas d'upsert : Prisma refuse une valeur nulle dans une cle unique composee,
  // or une ligne sans couleur en porte une.
  const existing = await db.cartItem.findFirst({
    where: { userId: user.id, productId, variantId: cle },
  });

  const voulu = (existing?.quantity ?? 0) + demande;

  if (voulu > stock) {
    return stock === 0
      ? { ok: false, messageKey: "outOfStock" }
      : { ok: false, messageKey: "stockLimited", values: { count: stock } };
  }

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: voulu } });
  } else {
    await db.cartItem.create({
      data: { userId: user.id, productId, variantId: cle, quantity: voulu },
    });
  }

  refresh();
  return { ok: true, messageKey: "addedToCart", values: { title: product.title } };
}

export async function updateCartItemAction(
  productId: string,
  quantity: number,
  variantId?: string | null
): Promise<ActionResult> {
  const product = await loadProduct(productId);
  if (!product) return { ok: false, messageKey: "itemNotFound" };

  const user = await getCurrentUser();
  const cle = variantId ?? null;

  if (quantity <= 0) return removeCartItemAction(productId, cle);

  const variante = cle
    ? await db.productVariant.findFirst({ where: { id: cle, productId }, select: { stock: true } })
    : null;
  const stock = variante ? variante.stock : product.stock;

  const retenu = Math.min(Math.max(quantity, product.minOrder), stock);

  if (!user) {
    const lignes = await readGuestCart();
    const cible = (l: { productId: string; variantId: string | null }) =>
      l.productId === productId && (l.variantId ?? null) === cle;
    if (!lignes.some(cible)) return { ok: false, messageKey: "itemNotFound" };
    await writeGuestCart(lignes.map((l) => (cible(l) ? { ...l, quantity: retenu } : l)));
  } else {
    const existing = await db.cartItem.findFirst({
      where: { userId: user.id, productId, variantId: cle },
    });
    if (!existing) return { ok: false, messageKey: "itemNotFound" };
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: retenu } });
  }

  refresh();
  return retenu < quantity
    ? { ok: true, messageKey: "stockLimited", values: { count: retenu } }
    : { ok: true, messageKey: "cartUpdated" };
}

export async function removeCartItemAction(
  productId: string,
  variantId?: string | null
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const cle = variantId ?? null;

  if (!user) {
    const lignes = await readGuestCart();
    await writeGuestCart(
      lignes.filter((l) => !(l.productId === productId && (l.variantId ?? null) === cle))
    );
  } else {
    await db.cartItem.deleteMany({ where: { userId: user.id, productId, variantId: cle } });
  }

  refresh();
  return { ok: true, messageKey: "itemRemoved" };
}

export async function clearCartAction(): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) await writeGuestCart([]);
  else await db.cartItem.deleteMany({ where: { userId: user.id } });

  refresh();
  return { ok: true, messageKey: "cartEmptied" };
}

/**
 * Les favoris restent lies a un compte : leur interet est justement de survivre
 * au navigateur et de se retrouver d'un appareil a l'autre.
 */
export async function toggleWishlistAction(productId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, messageKey: "signInToFavourites", requiresAuth: true };
  }

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/favoris");
    revalidatePath("/", "layout");
    return { ok: true, messageKey: "removedFromFavourites" };
  }

  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/favoris");
  revalidatePath("/", "layout");
  return { ok: true, messageKey: "addedToFavourites" };
}
