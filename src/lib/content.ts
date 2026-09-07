import "server-only";
import { db } from "./db";
import type { Locale } from "@/i18n/routing";

/**
 * Resolution des contenus traduits.
 *
 * Chaque champ traduit retombe silencieusement sur la version de reference
 * quand la traduction est absente ou vide. Une fiche a moitie traduite reste
 * donc parfaitement lisible : c'est ce qui permet de traduire au fil de l'eau
 * sans jamais casser le site.
 */

/** Filtre a passer a Prisma pour ne charger que la traduction utile. */
export const translationFilter = (locale: Locale) => ({ where: { locale } });

type Translation = {
  title?: string | null;
  name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

/** Retourne la traduction si elle porte du texte, sinon la valeur de reference. */
function pick(translated: string | null | undefined, fallback: string): string;
function pick(translated: string | null | undefined, fallback: string | null): string | null;
function pick(translated: string | null | undefined, fallback: string | null): string | null {
  const value = translated?.trim();
  return value ? value : fallback;
}

type TranslatableProduct = {
  title: string;
  subtitle: string | null;
  description: string;
  metaTitle: string | null;
  metaDescription: string | null;
  translations?: Translation[];
};

/** Applique la traduction d'un produit sur ses champs textuels. */
export function resolveProduct<T extends TranslatableProduct>(product: T): T {
  const translation = product.translations?.[0];
  if (!translation) return product;

  return {
    ...product,
    title: pick(translation.title, product.title),
    subtitle: pick(translation.subtitle, product.subtitle),
    description: pick(translation.description, product.description),
    metaTitle: pick(translation.metaTitle, product.metaTitle),
    metaDescription: pick(translation.metaDescription, product.metaDescription),
  };
}

type TranslatableCategory = {
  name: string;
  description: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  translations?: Translation[];
};

export function resolveCategory<T extends TranslatableCategory>(category: T): T {
  const translation = category.translations?.[0];
  if (!translation) return category;

  return {
    ...category,
    name: pick(translation.name, category.name),
    description: pick(translation.description, category.description),
    metaTitle: pick(translation.metaTitle, category.metaTitle ?? null),
    metaDescription: pick(translation.metaDescription, category.metaDescription ?? null),
  };
}

/** Categories triees et traduites : utilisees par l'en-tete, les filtres et le pied de page. */
export async function getTranslatedCategories(locale: Locale) {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { translations: translationFilter(locale) },
  });

  return categories.map(resolveCategory);
}

/** Categories avec le nombre de produits en ligne, pour les facettes. */
export async function getTranslatedCategoriesWithCounts(locale: Locale) {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      translations: translationFilter(locale),
      _count: { select: { products: { where: { active: true } } } },
    },
  });

  return categories.map(resolveCategory);
}
