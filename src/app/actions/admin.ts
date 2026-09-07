"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";

export type AdminState = { error?: string; success?: string };

/** Toute action du back-office passe par ce garde-fou. */
async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/connexion?redirectTo=/admin");
  return user;
}

function refreshAdmin(...paths: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  for (const path of paths) revalidatePath(path);
}

/* ------------------------------------------------------------------ produits */

const productSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  subtitle: z.string().optional(),
  description: z.string().min(10, "La description doit faire au moins 10 caracteres"),
  price: z.coerce.number().min(0.01, "Prix invalide"),
  compareAtPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0),
  sku: z.string().min(1, "La reference est requise"),
  condition: z.enum(["NEW", "REFURBISHED", "SECOND_HAND"]),
  minOrder: z.coerce.number().int().min(1),
  warrantyMonths: z.coerce.number().int().min(0),
  categoryId: z.string().min(1, "Categorie requise"),
  brandId: z.string().min(1, "Marque requise"),
  storage: z.string().optional(),
  color: z.string().optional(),
  carrier: z.string().optional(),
  imageUrl: z.string().optional(),
});

function readProductForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim(),
    price: String(formData.get("price") ?? "0").replace(",", "."),
    compareAtPrice: String(formData.get("compareAtPrice") ?? "").replace(",", ".") || undefined,
    stock: String(formData.get("stock") ?? "0"),
    sku: String(formData.get("sku") ?? "").trim(),
    condition: String(formData.get("condition") ?? "NEW"),
    minOrder: String(formData.get("minOrder") ?? "1"),
    warrantyMonths: String(formData.get("warrantyMonths") ?? "24"),
    categoryId: String(formData.get("categoryId") ?? ""),
    brandId: String(formData.get("brandId") ?? ""),
    storage: String(formData.get("storage") ?? "").trim() || undefined,
    color: String(formData.get("color") ?? "").trim() || undefined,
    carrier: String(formData.get("carrier") ?? "").trim() || undefined,
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || undefined,
  };
}

/** Genere un slug unique, en suffixant si necessaire. */
async function uniqueSlug(title: string, currentId?: string) {
  const base = slugify(title) || "produit";
  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

export async function createProductAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;

  const skuTaken = await db.product.findUnique({ where: { sku: data.sku } });
  if (skuTaken) return { error: `La reference ${data.sku} est deja utilisee.` };

  const product = await db.product.create({
    data: {
      slug: await uniqueSlug(data.title),
      title: data.title,
      subtitle: data.subtitle ?? null,
      description: data.description,
      price: Math.round(data.price * 100),
      compareAtPrice: data.compareAtPrice ? Math.round(data.compareAtPrice * 100) : null,
      stock: data.stock,
      sku: data.sku,
      condition: data.condition,
      minOrder: data.minOrder,
      warrantyMonths: data.warrantyMonths,
      categoryId: data.categoryId,
      brandId: data.brandId,
      storage: data.storage ?? null,
      color: data.color ?? null,
      carrier: data.carrier ?? null,
      tradeAssurance: formData.get("tradeAssurance") === "on",
      readyToShip: formData.get("readyToShip") === "on",
      featured: formData.get("featured") === "on",
      active: formData.get("active") === "on",
      images: data.imageUrl
        ? { create: [{ url: data.imageUrl, alt: data.title, sortOrder: 0 }] }
        : undefined,
    },
  });

  await saveSpecs(product.id, formData);

  refreshAdmin("/produits");
  redirect(`/admin/produits/${product.id}?enregistre=1`);
}

export async function updateProductAction(
  productId: string,
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  await guard();
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;

  const skuOwner = await db.product.findUnique({ where: { sku: data.sku }, select: { id: true } });
  if (skuOwner && skuOwner.id !== productId) {
    return { error: `La reference ${data.sku} est deja utilisee.` };
  }

  await db.product.update({
    where: { id: productId },
    data: {
      slug: await uniqueSlug(data.title, productId),
      title: data.title,
      subtitle: data.subtitle ?? null,
      description: data.description,
      price: Math.round(data.price * 100),
      compareAtPrice: data.compareAtPrice ? Math.round(data.compareAtPrice * 100) : null,
      stock: data.stock,
      sku: data.sku,
      condition: data.condition,
      minOrder: data.minOrder,
      warrantyMonths: data.warrantyMonths,
      categoryId: data.categoryId,
      brandId: data.brandId,
      storage: data.storage ?? null,
      color: data.color ?? null,
      carrier: data.carrier ?? null,
      tradeAssurance: formData.get("tradeAssurance") === "on",
      readyToShip: formData.get("readyToShip") === "on",
      featured: formData.get("featured") === "on",
      active: formData.get("active") === "on",
    },
  });

  if (data.imageUrl) {
    const first = await db.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    });
    if (first) await db.productImage.update({ where: { id: first.id }, data: { url: data.imageUrl } });
    else
      await db.productImage.create({
        data: { productId, url: data.imageUrl, alt: data.title, sortOrder: 0 },
      });
  }

  await saveSpecs(productId, formData);

  refreshAdmin("/produits");
  return { success: "Produit enregistre." };
}

/** Les caracteristiques sont envoyees en lignes paralleles specLabel[] / specValue[]. */
async function saveSpecs(productId: string, formData: FormData) {
  const labels = formData.getAll("specLabel").map((v) => String(v).trim());
  const values = formData.getAll("specValue").map((v) => String(v).trim());
  if (!labels.length) return;

  await db.productSpec.deleteMany({ where: { productId } });

  const rows = labels
    .map((label, index) => ({ label, value: values[index] ?? "", sortOrder: index }))
    .filter((row) => row.label && row.value);

  if (rows.length) {
    await db.productSpec.createMany({ data: rows.map((row) => ({ ...row, productId })) });
  }
}

export async function toggleProductActiveAction(productId: string) {
  await guard();
  const product = await db.product.findUnique({ where: { id: productId }, select: { active: true } });
  if (!product) return;
  await db.product.update({ where: { id: productId }, data: { active: !product.active } });
  refreshAdmin("/produits");
}

export async function deleteProductAction(productId: string) {
  await guard();
  await db.product.delete({ where: { id: productId } });
  refreshAdmin("/produits");
  redirect("/admin/produits?supprime=1");
}

export async function bulkStockAction(productId: string, formData: FormData) {
  await guard();
  const stock = Number(formData.get("stock"));
  if (!Number.isFinite(stock) || stock < 0) return;
  await db.product.update({ where: { id: productId }, data: { stock: Math.round(stock) } });
  refreshAdmin("/produits");
}

/* ---------------------------------------------------------------- categories */

export async function saveCategoryAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "package");
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (name.length < 2) return { error: "Le nom est requis." };

  const slug = slugify(name);
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { error: "Une categorie porte deja ce nom." };

  if (id) {
    await db.category.update({ where: { id }, data: { name, slug, icon, description, sortOrder } });
  } else {
    await db.category.create({ data: { name, slug, icon, description, sortOrder } });
  }

  refreshAdmin();
  return { success: id ? "Categorie mise a jour." : "Categorie creee." };
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await guard();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) return; // Une categorie utilisee ne peut pas etre supprimee.
  await db.category.delete({ where: { id } });
  refreshAdmin();
}

/* -------------------------------------------------------------------- marques */

export async function saveBrandAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const accent = String(formData.get("accent") ?? "#64748b");

  if (name.length < 1) return { error: "Le nom est requis." };

  const slug = slugify(name);
  const clash = await db.brand.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { error: "Une marque porte deja ce nom." };

  if (id) await db.brand.update({ where: { id }, data: { name, slug, accent } });
  else await db.brand.create({ data: { name, slug, accent } });

  refreshAdmin();
  return { success: id ? "Marque mise a jour." : "Marque creee." };
}

export async function deleteBrandAction(id: string): Promise<void> {
  await guard();
  const count = await db.product.count({ where: { brandId: id } });
  if (count > 0) return;
  await db.brand.delete({ where: { id } });
  refreshAdmin();
}

/* ------------------------------------------------------------------ commandes */

export async function updateOrderAction(orderId: string, formData: FormData) {
  await guard();
  const status = String(formData.get("status") ?? "");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return;

  await db.order.update({ where: { id: orderId }, data: { status, trackingNumber, notes } });
  refreshAdmin(`/admin/commandes/${orderId}`);
}

export async function setOrderStatusAction(orderId: string, status: string) {
  await guard();
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return;
  await db.order.update({ where: { id: orderId }, data: { status } });
  refreshAdmin();
}

/* --------------------------------------------------------------------- avis */

export async function moderateReviewAction(reviewId: string, status: string) {
  await guard();
  if (!["PENDING", "PUBLISHED", "REJECTED"].includes(status)) return;
  const review = await db.review.update({
    where: { id: reviewId },
    data: { status },
    include: { product: { select: { slug: true } } },
  });
  refreshAdmin(`/produits/${review.product.slug}`);
}

export async function deleteReviewAction(reviewId: string) {
  await guard();
  await db.review.delete({ where: { id: reviewId } });
  refreshAdmin();
}

/* ---------------------------------------------------------------- utilisateurs */

export async function setUserRoleAction(userId: string, role: string) {
  const admin = await guard();
  if (!["CUSTOMER", "ADMIN"].includes(role)) return;
  // Un administrateur ne peut pas se retrograder lui-meme.
  if (userId === admin.id) return;
  await db.user.update({ where: { id: userId }, data: { role } });
  refreshAdmin();
}

const createUserSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("E-mail invalide"),
  password: z.string().min(8, "8 caracteres minimum"),
  role: z.enum(["CUSTOMER", "ADMIN"]),
});

export async function createUserAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();
  const parsed = createUserSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "CUSTOMER"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Cette adresse est deja utilisee." };

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
  });

  refreshAdmin();
  return { success: "Compte cree." };
}

export async function deleteUserAction(userId: string) {
  const admin = await guard();
  if (userId === admin.id) return;
  await db.user.delete({ where: { id: userId } });
  refreshAdmin();
}

/* ------------------------------------------------------------------ reglages */

export async function saveSettingsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();

  const keys = [
    "store.name",
    "store.tagline",
    "store.email",
    "store.phone",
    "shipping.freeThreshold",
    "shipping.flatRate",
    "banner.text",
  ];

  for (const key of keys) {
    const value = String(formData.get(key) ?? "");
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  refreshAdmin();
  return { success: "Reglages enregistres." };
}
