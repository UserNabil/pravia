"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE, VAT_RATE } from "@/lib/constants";

export type CheckoutState = { error?: string };

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis"),
  line1: z.string().min(4, "Adresse requise"),
  line2: z.string().optional(),
  city: z.string().min(2, "Ville requise"),
  zip: z.string().min(3, "Code postal requis"),
  country: z.string().min(2, "Pays requis"),
  phone: z.string().optional(),
  paymentMethod: z.enum(["CARD", "PAYPAL", "TRANSFER"]),
  saveAddress: z.string().optional(),
});

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?redirectTo=/commande");

  const parsed = checkoutSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    line1: String(formData.get("line1") ?? "").trim(),
    line2: String(formData.get("line2") ?? "").trim() || undefined,
    city: String(formData.get("city") ?? "").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    country: String(formData.get("country") ?? "France").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    paymentMethod: String(formData.get("paymentMethod") ?? "CARD"),
    saveAddress: String(formData.get("saveAddress") ?? ""),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const cart = await db.cartItem.findMany({
    where: { userId: user.id },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });

  if (!cart.length) return { error: "Votre panier est vide." };

  // Verification du stock avant d'engager la commande.
  for (const item of cart) {
    if (!item.product.active) return { error: `${item.product.title} n'est plus disponible.` };
    if (item.quantity > item.product.stock) {
      return { error: `Stock insuffisant pour ${item.product.title} (${item.product.stock} restant).` };
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));
  const data = parsed.data;

  const count = await db.order.count();
  const number = `PRV-${new Date().getFullYear()}-${String(1000 + count + 1)}`;

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        userId: user.id,
        status: "PAID", // Paiement simule : la commande est validee immediatement.
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping,
        paymentMethod: data.paymentMethod,
        shipFullName: data.fullName,
        shipLine1: data.line1,
        shipLine2: data.line2 ?? null,
        shipCity: data.city,
        shipZip: data.zip,
        shipCountry: data.country,
        shipPhone: data.phone ?? null,
        items: {
          create: cart.map((item) => ({
            productId: item.productId,
            titleSnapshot: item.product.title,
            priceSnapshot: item.product.price,
            imageSnapshot: item.product.images[0]?.url ?? null,
            quantity: item.quantity,
          })),
        },
      },
    });

    for (const item of cart) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: user.id } });

    if (data.saveAddress === "on") {
      await tx.address.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          line1: data.line1,
          line2: data.line2 ?? null,
          city: data.city,
          zip: data.zip,
          country: data.country,
          phone: data.phone ?? null,
        },
      });
    }

    return created;
  });

  revalidatePath("/", "layout");
  revalidatePath("/compte/commandes");
  redirect(`/compte/commandes/${order.id}?nouvelle=1`);
}

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(3, "Titre trop court"),
  body: z.string().min(10, "Votre avis doit contenir au moins 10 caracteres"),
});

export async function submitReviewAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connectez-vous pour laisser un avis." };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  });
  if (!product) return { error: "Produit introuvable." };

  await db.review.upsert({
    where: { productId_userId: { productId: parsed.data.productId, userId: user.id } },
    update: {
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "PENDING",
    },
    create: {
      productId: parsed.data.productId,
      userId: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "PENDING",
    },
  });

  revalidatePath(`/produits/${product.slug}`);
  return { success: "Merci ! Votre avis sera publie apres moderation." };
}
