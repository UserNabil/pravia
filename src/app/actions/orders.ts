"use server";

import { redirectLocalized } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentCart } from "@/lib/current-cart";
import { clearGuestCart, LAST_ORDER_COOKIE } from "@/lib/guest-cart";
import { quoteShipping } from "@/lib/shipping";
import { normaliserTelephone } from "@/lib/phone";
import { VAT_RATE } from "@/lib/constants";
import { toLocale } from "@/i18n/routing";

export type CheckoutState = { errorKey?: string; values?: Record<string, string | number> };

/**
 * Le formulaire ne demande que le strict necessaire a une livraison : qui, ou,
 * et comment joindre le destinataire. Ni pays ni code postal, la boutique ne
 * desservant que l'Algerie.
 */
const checkoutSchema = z.object({
  firstName: z.string().min(2, "firstNameRequired"),
  lastName: z.string().min(2, "lastNameRequired"),
  // Le numero est enregistre sous sa forme nationale, quelle que soit la
  // maniere dont il a ete saisi.
  phone: z
    .string()
    .transform((valeur) => normaliserTelephone(valeur))
    .refine((valeur): valeur is string => valeur !== null, "phoneInvalid"),
  wilayaCode: z.number().int().min(1, "wilayaRequired").max(99, "wilayaRequired"),
  commune: z.string().min(1, "communeRequired"),
  deliveryMode: z.enum(["HOME", "DESK"]),
});

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  // Aucune connexion exigee : le compte ne sert qu'a retrouver ses commandes.
  const user = await getCurrentUser();

  const parsed = checkoutSchema.safeParse({
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    wilayaCode: Number(formData.get("wilayaCode") ?? 0),
    commune: String(formData.get("commune") ?? "").trim(),
    // Deux valeurs possibles : tout le reste vaut une remise a domicile.
    deliveryMode: formData.get("deliveryMode") === "DESK" ? "DESK" : "HOME",
  });

  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  // Langue transmise par le formulaire : elle sert aux redirections finales.
  const langue = toLocale(String(formData.get("locale") ?? ""));

  const { items: cart } = await getCurrentCart();
  if (!cart.length) return { errorKey: "cartEmpty" };

  // Verification du stock avant d'engager la commande.
  for (const item of cart) {
    if (!item.product.active) {
      return { errorKey: "productUnavailable", values: { title: item.product.title } };
    }
    if (item.quantity > item.product.stock) {
      return {
        errorKey: "insufficientStock",
        values: { title: item.product.title, stock: item.product.stock },
      };
    }
  }

  const data = parsed.data;

  // La wilaya et la commune sont revalidees en base : le tarif retenu ne vient
  // jamais du formulaire, seulement de la grille du back-office.
  const destination = await db.wilaya.findUnique({
    where: { code: data.wilayaCode },
    select: {
      name: true,
      active: true,
      communes: { where: { name: data.commune }, select: { name: true }, take: 1 },
    },
  });

  if (!destination || !destination.active) return { errorKey: "wilayaUnknown" };
  if (!destination.communes.length) return { errorKey: "communeUnknown" };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const { fee: shipping } = await quoteShipping(
    { wilayaCode: data.wilayaCode, commune: data.commune, mode: data.deliveryMode },
    subtotal
  );
  const tax = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));

  const count = await db.order.count();
  const number = `PRV-${new Date().getFullYear()}-${String(1000 + count + 1)}`;

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        userId: user?.id ?? null,
        status: "PAID", // Paiement simule : la commande est validee immediatement.
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping,
        paymentMethod: "CASH", // especes a la livraison, seul mode accepte
        shipFirstName: data.firstName,
        shipLastName: data.lastName,
        shipWilayaCode: data.wilayaCode,
        shipWilaya: destination.name,
        shipCommune: destination.communes[0].name,
        shipPhone: data.phone,
        deliveryMode: data.deliveryMode,
        items: {
          create: cart.map((item) => ({
            productId: item.product.id,
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
        where: { id: item.product.id },
        data: {
          stock: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }

    if (user) await tx.cartItem.deleteMany({ where: { userId: user.id } });

    return created;
  });

  if (!user) await clearGuestCart();

  revalidatePath("/", "layout");
  revalidatePath("/compte/commandes");

  // Un client connecte retrouve sa commande dans son espace. Un visiteur sans
  // compte est oriente vers une confirmation protegee par un cookie : le
  // numero seul ne suffit pas a consulter une commande.
  if (user) return redirectLocalized(`/compte/commandes/${order.id}?nouvelle=1`, langue);

  (await cookies()).set(LAST_ORDER_COOKIE, order.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return redirectLocalized("/commande/confirmee", langue);
}

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(3, "reviewTitleTooShort"),
  body: z.string().min(10, "reviewBodyTooShort"),
});

export type ReviewState = { errorKey?: string; submitted?: boolean };

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { errorKey: "signInToReview" };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
  });

  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  });
  if (!product) return { errorKey: "productNotFound" };

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
  return { submitted: true };
}
