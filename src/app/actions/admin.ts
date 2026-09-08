"use server";

import { redirectLocalized } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { rebuildSearchIndex, syncProductSearchText } from "@/lib/search-index";
import { ORDER_STATUSES, WARRANTY_UNITS } from "@/lib/constants";

/**
 * Retour d'une action du back-office.
 *
 * Les actions renvoient des cles, pas du texte : c'est le composant qui rend
 * le message dans la langue de son interface.
 */
export type AdminState = {
  errorKey?: string;
  successKey?: string;
  values?: Record<string, string | number>;
};

/** Toute action du back-office passe par ce garde-fou. */
async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return redirectLocalized("/connexion?redirectTo=/admin");
  }
  return user;
}

function refreshAdmin(...paths: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  for (const path of paths) revalidatePath(path);
}

/* ------------------------------------------------------------------ produits */

const productSchema = z.object({
  title: z.string().min(2, "titleRequired"),
  subtitle: z.string().optional(),
  description: z.string().min(10, "descriptionTooShort"),
  price: z.coerce.number().min(0.01, "invalidPrice"),
  compareAtPrice: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0),
  sku: z.string().min(1, "skuRequired"),
  condition: z.enum(["NEW", "REFURBISHED", "SECOND_HAND"]),
  minOrder: z.coerce.number().int().min(1),
  warrantyValue: z.coerce.number().int().min(0),
  warrantyUnit: z.enum(WARRANTY_UNITS),
  categoryId: z.string().min(1, "categoryRequired"),
  brandId: z.string().min(1, "brandRequired"),
  storage: z.string().optional(),
  color: z.string().optional(),
  carrier: z.string().optional(),
  imageUrl: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
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
    warrantyValue: String(formData.get("warrantyValue") ?? "12"),
    warrantyUnit: String(formData.get("warrantyUnit") ?? "MONTH"),
    categoryId: String(formData.get("categoryId") ?? ""),
    brandId: String(formData.get("brandId") ?? ""),
    storage: String(formData.get("storage") ?? "").trim() || undefined,
    color: String(formData.get("color") ?? "").trim() || undefined,
    carrier: String(formData.get("carrier") ?? "").trim() || undefined,
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || undefined,
    metaTitle: String(formData.get("metaTitle") ?? "").trim() || undefined,
    metaDescription: String(formData.get("metaDescription") ?? "").trim() || undefined,
    ogImage: String(formData.get("ogImage") ?? "").trim() || undefined,
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
  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  const data = parsed.data;

  const skuTaken = await db.product.findUnique({ where: { sku: data.sku } });
  if (skuTaken) return { errorKey: "skuTaken", values: { sku: data.sku } };

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
      warrantyValue: data.warrantyValue,
      warrantyUnit: data.warrantyUnit,
      categoryId: data.categoryId,
      brandId: data.brandId,
      storage: data.storage ?? null,
      color: data.color ?? null,
      carrier: data.carrier ?? null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      ogImage: data.ogImage ?? null,
      noIndex: formData.get("noIndex") === "on",
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
  await saveVariants(product.id, formData);
  await syncProductSearchText(product.id);

  refreshAdmin("/produits");
  return redirectLocalized(`/admin/produits/${product.id}?enregistre=1`);
}

export async function updateProductAction(
  productId: string,
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  await guard();
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  const data = parsed.data;

  const skuOwner = await db.product.findUnique({ where: { sku: data.sku }, select: { id: true } });
  if (skuOwner && skuOwner.id !== productId) {
    return { errorKey: "skuTaken", values: { sku: data.sku } };
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
      warrantyValue: data.warrantyValue,
      warrantyUnit: data.warrantyUnit,
      categoryId: data.categoryId,
      brandId: data.brandId,
      storage: data.storage ?? null,
      color: data.color ?? null,
      carrier: data.carrier ?? null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      ogImage: data.ogImage ?? null,
      noIndex: formData.get("noIndex") === "on",
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
  await saveVariants(productId, formData);
  await saveProductTranslations(productId, formData);
  await syncProductSearchText(productId);

  refreshAdmin("/produits");
  return { successKey: "productSaved" };
}

/**
 * Lit les champs de traduction d'un formulaire.
 *
 * Ils arrivent sous la forme `tr.<langue>.<champ>`. Un champ vide n'est pas
 * une erreur : il fait simplement retomber l'affichage sur la version de
 * reference, ce qui permet de traduire au fil de l'eau.
 */
function readTranslations(formData: FormData, fields: readonly string[]) {
  const result: { locale: string; data: Record<string, string | null> }[] = [];

  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;

    const data: Record<string, string | null> = {};
    for (const field of fields) {
      const raw = formData.get(`tr.${locale}.${field}`);
      data[field] = raw === null ? null : String(raw).trim() || null;
    }
    result.push({ locale, data });
  }

  return result;
}

/** Enregistre les traductions d'un produit, en supprimant celles devenues vides. */
async function saveProductTranslations(productId: string, formData: FormData) {
  const fields = ["title", "subtitle", "description", "metaTitle", "metaDescription"] as const;

  for (const { locale, data } of readTranslations(formData, fields)) {
    const empty = Object.values(data).every((value) => value === null);

    if (empty) {
      await db.productTranslation.deleteMany({ where: { productId, locale } });
      continue;
    }

    await db.productTranslation.upsert({
      where: { productId_locale: { productId, locale } },
      update: data,
      create: { productId, locale, ...data },
    });
  }
}

/** Meme principe pour une categorie. */
async function saveCategoryTranslations(categoryId: string, formData: FormData) {
  const fields = ["name", "description", "metaTitle", "metaDescription"] as const;

  for (const { locale, data } of readTranslations(formData, fields)) {
    const empty = Object.values(data).every((value) => value === null);

    if (empty) {
      await db.categoryTranslation.deleteMany({ where: { categoryId, locale } });
      continue;
    }

    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale } },
      update: data,
      create: { categoryId, locale, ...data },
    });
  }
}

/** Les caracteristiques sont envoyees en lignes paralleles specLabel[] / specValue[]. */
/**
 * Enregistre les declinaisons de couleur d'un produit.
 *
 * On ne supprime pas pour recreer, comme le fait saveSpecs : une declinaison
 * est referencee par les lignes de panier et de commande. Les recreer leur
 * donnerait de nouveaux identifiants et effacerait ces liens — l'historique
 * perdrait la couleur commandee. Les lignes existantes sont donc mises a jour,
 * et seules les teintes reellement retirees du formulaire sont supprimees.
 */
async function saveVariants(productId: string, formData: FormData) {
  const ids = formData.getAll("variantId").map((v) => String(v));
  const noms = formData.getAll("variantName").map((v) => String(v).trim());
  const nomsAr = formData.getAll("variantNameAr").map((v) => String(v).trim());
  const teintes = formData.getAll("variantHex").map((v) => String(v).trim());
  const stocks = formData.getAll("variantStock").map((v) => Number(v) || 0);
  const visuels = formData.getAll("variantImage").map((v) => String(v).trim());

  // Champ absent du formulaire : le produit n'a pas de section declinaisons,
  // on ne touche a rien plutot que de tout effacer.
  if (!formData.has("variantName")) return;

  const lignes = noms
    .map((name, i) => ({
      id: ids[i] || null,
      name,
      nameAr: nomsAr[i] || null,
      hex: /^#[0-9a-f]{6}$/i.test(teintes[i] ?? "") ? teintes[i] : "#000000",
      stock: Math.max(0, Math.trunc(stocks[i] ?? 0)),
      imageUrl: visuels[i] || null,
      sortOrder: i,
    }))
    .filter((l) => l.name);

  const conserves = lignes.map((l) => l.id).filter((id): id is string => Boolean(id));
  await db.productVariant.deleteMany({
    where: { productId, id: { notIn: conserves.length ? conserves : ["-"] } },
  });

  for (const ligne of lignes) {
    const { id, ...donnees } = ligne;
    if (id) {
      await db.productVariant.update({ where: { id }, data: donnees });
    } else {
      await db.productVariant.create({ data: { ...donnees, productId } });
    }
  }

  // Le stock du produit devient la somme des teintes : c'est lui qu'affichent
  // le catalogue et la fiche tant qu'aucune couleur n'est choisie.
  if (lignes.length) {
    await db.product.update({
      where: { id: productId },
      data: { stock: lignes.reduce((somme, l) => somme + l.stock, 0) },
    });
  }
}

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

/**
 * Supprime un produit et tout ce qui en depend.
 *
 * Le nettoyage est explicite plutot que delegue aux cascades : SQL Server
 * interdit plusieurs chemins de cascade vers une meme table, ces relations y
 * sont donc en NoAction. Faire le menage ici garantit un comportement
 * identique quel que soit le moteur.
 */
export async function deleteProductAction(productId: string) {
  await guard();

  await db.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { productId } });
    await tx.wishlistItem.deleteMany({ where: { productId } });
    await tx.review.deleteMany({ where: { productId } });
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productSpec.deleteMany({ where: { productId } });
    // Les lignes de commande sont conservees : elles portent un instantane du
    // produit (titre, prix, visuel) et constituent l'historique de facturation.
    await tx.orderItem.updateMany({ where: { productId }, data: { productId: null } });
    await tx.product.delete({ where: { id: productId } });
  });

  refreshAdmin("/produits");
  return redirectLocalized("/admin/produits?supprime=1");
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

  if (name.length < 2) return { errorKey: "nameRequired" };

  const slug = slugify(name);
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { errorKey: "categoryNameTaken" };

  const seo = {
    metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
    metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
    noIndex: formData.get("noIndex") === "on",
  };

  if (id) {
    await db.category.update({
      where: { id },
      data: { name, slug, icon, description, sortOrder, ...seo },
    });
    // Le nom de la categorie alimente l'index : il faut le repercuter.
    await reindexProductsOf({ categoryId: id });
    await saveCategoryTranslations(id, formData);
  } else {
    const created = await db.category.create({
      data: { name, slug, icon, description, sortOrder, ...seo },
    });
    await saveCategoryTranslations(created.id, formData);
  }

  refreshAdmin();
  return { successKey: id ? "categoryUpdated" : "categoryCreated" };
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

  if (name.length < 1) return { errorKey: "nameRequired" };

  const slug = slugify(name);
  const clash = await db.brand.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { errorKey: "brandNameTaken" };

  if (id) {
    await db.brand.update({ where: { id }, data: { name, slug, accent } });
    await reindexProductsOf({ brandId: id });
  } else {
    await db.brand.create({ data: { name, slug, accent } });
  }

  refreshAdmin();
  return { successKey: id ? "brandUpdated" : "brandCreated" };
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
  name: z.string().min(2, "userNameRequired"),
  email: z.string().email("invalidEmail"),
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

  if (!parsed.success) return { errorKey: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { errorKey: "emailTaken" };

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
  });

  refreshAdmin();
  return { successKey: "userCreated" };
}

/** Supprime un compte et ses donnees, en conservant l'historique de commandes. */
export async function deleteUserAction(
  userId: string
): Promise<{ messageKey: string; values?: Record<string, number>; tone: "success" | "error" }> {
  const admin = await guard();
  // Un administrateur ne peut pas supprimer son propre compte.
  if (userId === admin.id) {
    return { messageKey: "cannotDeleteSelf", tone: "error" };
  }

  const orderCount = await db.order.count({ where: { userId } });
  if (orderCount > 0) {
    // Un compte ayant commande ne peut pas disparaitre sans emporter des pieces
    // comptables : on le desactive plutot, en le retrogradant et en le rendant
    // inutilisable pour la connexion.
    await db.user.update({
      where: { id: userId },
      data: {
        role: "CUSTOMER",
        passwordHash: await hashPassword(crypto.randomUUID()),
      },
    });
    refreshAdmin();
    return { messageKey: "userDisabled", values: { count: orderCount }, tone: "success" };
  }

  await db.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  refreshAdmin();
  return { messageKey: "userDeleted", tone: "success" };
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
    // Le bandeau se decline par langue ; la cle nue sert de repli.
    "banner.text",
    "banner.text.fr",
    "banner.text.en",
    "banner.text.ar",
  ];

  for (const key of keys) {
    const value = String(formData.get(key) ?? "");
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  refreshAdmin();
  return { successKey: "settingsSaved" };
}

/* ------------------------------------------------------------- referencement */

/** Reindexe les produits d'une categorie ou d'une marque apres renommage. */
async function reindexProductsOf(where: { categoryId?: string; brandId?: string }) {
  const products = await db.product.findMany({ where, select: { id: true } });
  for (const product of products) {
    await syncProductSearchText(product.id);
  }
}

const SEO_KEYS = [
  "seo.siteUrl",
  "seo.siteName",
  "seo.titleTemplate",
  "seo.defaultTitle",
  "seo.defaultDescription",
  "seo.defaultOgImage",
  "seo.twitterHandle",
  "seo.googleVerification",
  "seo.bingVerification",
  "seo.organizationLegalName",
  "seo.organizationAddress",
] as const;

export async function saveSeoSettingsAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  await guard();

  const siteUrl = String(formData.get("seo.siteUrl") ?? "").trim();
  if (siteUrl && !/^https?:\/\/[^\s/]+/i.test(siteUrl)) {
    return { errorKey: "siteUrlScheme" };
  }

  for (const key of SEO_KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // Case cochee = site indexable ; absente = interdiction totale aux robots.
  const indexable = formData.get("seo.indexable") === "on" ? "1" : "0";
  await db.setting.upsert({
    where: { key: "seo.indexable" },
    update: { value: indexable },
    create: { key: "seo.indexable", value: indexable },
  });

  refreshAdmin();
  return { successKey: indexable === "1" ? "seoSavedIndexable" : "seoSavedBlocked" };
}

export async function saveSeoPageAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();

  const path = String(formData.get("path") ?? "").trim();
  if (!path.startsWith("/")) return { errorKey: "pathLeadingSlash" };

  const priority = Number(formData.get("priority") ?? 0.5);

  const data = {
    label: String(formData.get("label") ?? path).trim(),
    metaTitle: String(formData.get("metaTitle") ?? "").trim() || null,
    metaDescription: String(formData.get("metaDescription") ?? "").trim() || null,
    ogImage: String(formData.get("ogImage") ?? "").trim() || null,
    noIndex: formData.get("noIndex") === "on",
    inSitemap: formData.get("inSitemap") === "on",
    changeFrequency: String(formData.get("changeFrequency") ?? "weekly"),
    priority: Number.isFinite(priority) ? Math.min(1, Math.max(0, priority)) : 0.5,
  };

  await db.seoPage.upsert({ where: { path }, update: data, create: { path, ...data } });

  refreshAdmin(path);
  return { successKey: "pageSaved" };
}

/* ------------------------------------------------------------------ recherche */

export async function saveSynonymAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await guard();

  const { normalize } = await import("@/lib/search");
  const term = normalize(String(formData.get("term") ?? ""));
  const targets = String(formData.get("targets") ?? "").trim();

  if (!term) return { errorKey: "synonymTermRequired" };
  if (!targets) return { errorKey: "synonymTargetsRequired" };

  await db.searchSynonym.upsert({
    where: { term },
    update: { targets },
    create: { term, targets },
  });

  refreshAdmin();
  return { successKey: "synonymSaved", values: { term, targets } };
}

export async function deleteSynonymAction(id: string): Promise<void> {
  await guard();
  await db.searchSynonym.delete({ where: { id } });
  refreshAdmin();
}

export async function rebuildSearchIndexAction(): Promise<void> {
  await guard();
  await rebuildSearchIndex();
  refreshAdmin();
}

export async function clearSearchLogAction(): Promise<void> {
  await guard();
  await db.searchQuery.deleteMany();
  refreshAdmin();
}
