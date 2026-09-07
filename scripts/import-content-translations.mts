/**
 * Charge en base les traductions de contenu (produits, categories, specs).
 *
 * Le script est idempotent : il peut etre relance apres correction d'une
 * formulation. Un champ vide n'est pas ecrit, ce qui laisse l'affichage
 * retomber sur la version francaise de reference.
 *
 * Usage : npx tsx scripts/import-content-translations.mts
 */
import fs from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import productsEn from "./content/products-en.mjs";
import productsAr from "./content/products-ar.mjs";
import { en as categoriesEn, ar as categoriesAr } from "./content/categories.mjs";
import { labels as specLabels, values as specValues } from "./content/specs.mjs";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

type Text = Record<string, string | undefined>;

const PRODUCTS: Record<string, Record<string, Text>> = { en: productsEn, ar: productsAr };
const CATEGORIES: Record<string, Record<string, Text>> = { en: categoriesEn, ar: categoriesAr };

let products = 0;
let categories = 0;
let specs = 0;
const missing: string[] = [];

/* ------------------------------------------------------------------ produits */

for (const [locale, entries] of Object.entries(PRODUCTS)) {
  for (const [slug, text] of Object.entries(entries)) {
    const product = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) {
      missing.push(`produit ${slug}`);
      continue;
    }

    const data = {
      title: text.title ?? null,
      subtitle: text.subtitle ?? null,
      description: text.description ?? null,
      metaTitle: text.metaTitle ?? null,
      metaDescription: text.metaDescription ?? null,
    };

    await db.productTranslation.upsert({
      where: { productId_locale: { productId: product.id, locale } },
      update: data,
      create: { productId: product.id, locale, ...data },
    });
    products += 1;
  }
}

/* ---------------------------------------------------------------- categories */

for (const [locale, entries] of Object.entries(CATEGORIES)) {
  for (const [slug, text] of Object.entries(entries)) {
    const category = await db.category.findUnique({ where: { slug }, select: { id: true } });
    if (!category) {
      missing.push(`categorie ${slug}`);
      continue;
    }

    const data = {
      name: text.name ?? null,
      description: text.description ?? null,
      metaTitle: text.metaTitle ?? null,
      metaDescription: text.metaDescription ?? null,
    };

    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: category.id, locale } },
      update: data,
      create: { categoryId: category.id, locale, ...data },
    });
    categories += 1;
  }
}

/* --------------------------------------------------------------------- specs */

const allSpecs = await db.productSpec.findMany({ select: { id: true, label: true, value: true } });

for (const spec of allSpecs) {
  const label = (specLabels as Record<string, { en: string; ar: string }>)[spec.label];
  const value = (specValues as Record<string, { en: string; ar: string }>)[spec.value];
  if (!label && !value) continue;

  for (const locale of ["en", "ar"] as const) {
    const data = {
      label: label ? label[locale] : null,
      value: value ? value[locale] : null,
    };

    await db.productSpecTranslation.upsert({
      where: { specId_locale: { specId: spec.id, locale } },
      update: data,
      create: { specId: spec.id, locale, ...data },
    });
    specs += 1;
  }
}

console.log(
  `${products} traductions de produits, ${categories} de categories, ${specs} de caracteristiques.`
);
if (missing.length) console.log(`Introuvables : ${missing.join(", ")}`);

await db.$disconnect();
