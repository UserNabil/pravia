"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type ActionResult = { ok: boolean; message: string; requiresAuth?: boolean };

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/panier");
}

export async function addToCartAction(productId: string, quantity = 1): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Connectez-vous pour ajouter au panier.", requiresAuth: true };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { stock: true, active: true, title: true, minOrder: true },
  });

  if (!product || !product.active) {
    return { ok: false, message: "Ce produit n'est plus disponible." };
  }

  const existing = await db.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  const requested = (existing?.quantity ?? 0) + Math.max(quantity, product.minOrder);

  if (requested > product.stock) {
    return {
      ok: false,
      message:
        product.stock === 0
          ? "Produit en rupture de stock."
          : `Stock insuffisant : ${product.stock} unite(s) disponible(s).`,
    };
  }

  await db.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { quantity: requested },
    create: { userId: user.id, productId, quantity: requested },
  });

  refresh();
  return { ok: true, message: `${product.title} ajoute au panier.` };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expiree.", requiresAuth: true };

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { stock: true, minOrder: true } } },
  });

  if (!item || item.userId !== user.id) {
    return { ok: false, message: "Article introuvable." };
  }

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    refresh();
    return { ok: true, message: "Article retire du panier." };
  }

  const clamped = Math.min(Math.max(quantity, item.product.minOrder), item.product.stock);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: clamped } });

  refresh();
  return {
    ok: true,
    message: clamped < quantity ? `Quantite limitee au stock disponible (${clamped}).` : "Panier mis a jour.",
  };
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expiree.", requiresAuth: true };

  const item = await db.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== user.id) return { ok: false, message: "Article introuvable." };

  await db.cartItem.delete({ where: { id: itemId } });
  refresh();
  return { ok: true, message: "Article retire du panier." };
}

export async function clearCartAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expiree.", requiresAuth: true };

  await db.cartItem.deleteMany({ where: { userId: user.id } });
  refresh();
  return { ok: true, message: "Panier vide." };
}

export async function toggleWishlistAction(productId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Connectez-vous pour utiliser vos favoris.", requiresAuth: true };
  }

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/favoris");
    revalidatePath("/", "layout");
    return { ok: true, message: "Retire des favoris." };
  }

  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/favoris");
  revalidatePath("/", "layout");
  return { ok: true, message: "Ajoute aux favoris." };
}
