"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Les actions renvoient une cle de message plutot qu'un texte : c'est le
 * composant client qui la traduit, dans la langue de la page. Le serveur n'a
 * ainsi jamais a deviner la langue de l'appelant.
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

export async function addToCartAction(productId: string, quantity = 1): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, messageKey: "signInToCart", requiresAuth: true };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { stock: true, active: true, title: true, minOrder: true },
  });

  if (!product || !product.active) {
    return { ok: false, messageKey: "productUnavailable" };
  }

  const existing = await db.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  const requested = (existing?.quantity ?? 0) + Math.max(quantity, product.minOrder);

  if (requested > product.stock) {
    return product.stock === 0
      ? { ok: false, messageKey: "outOfStock" }
      : { ok: false, messageKey: "stockLimited", values: { count: product.stock } };
  }

  await db.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { quantity: requested },
    create: { userId: user.id, productId, quantity: requested },
  });

  refresh();
  return { ok: true, messageKey: "addedToCart", values: { title: product.title } };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, messageKey: "sessionExpired", requiresAuth: true };

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { stock: true, minOrder: true } } },
  });

  if (!item || item.userId !== user.id) {
    return { ok: false, messageKey: "itemNotFound" };
  }

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    refresh();
    return { ok: true, messageKey: "itemRemoved" };
  }

  const clamped = Math.min(Math.max(quantity, item.product.minOrder), item.product.stock);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: clamped } });

  refresh();
  return clamped < quantity
    ? { ok: true, messageKey: "stockLimited", values: { count: clamped } }
    : { ok: true, messageKey: "cartUpdated" };
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, messageKey: "sessionExpired", requiresAuth: true };

  const item = await db.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== user.id) return { ok: false, messageKey: "itemNotFound" };

  await db.cartItem.delete({ where: { id: itemId } });
  refresh();
  return { ok: true, messageKey: "itemRemoved" };
}

export async function clearCartAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, messageKey: "sessionExpired", requiresAuth: true };

  await db.cartItem.deleteMany({ where: { userId: user.id } });
  refresh();
  return { ok: true, messageKey: "cartEmptied" };
}

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
