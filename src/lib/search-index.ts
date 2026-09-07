import "server-only";
import { db } from "./db";
import { buildSearchText } from "./search";

/**
 * Recalcule l'index de recherche d'un produit.
 * A appeler apres toute ecriture touchant au titre, a la marque, a la
 * categorie ou aux caracteristiques.
 */
export async function syncProductSearchText(productId: string): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      title: true,
      subtitle: true,
      description: true,
      sku: true,
      storage: true,
      color: true,
      carrier: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      specs: { select: { label: true, value: true } },
    },
  });

  if (!product) return;

  await db.product.update({
    where: { id: productId },
    data: {
      searchText: buildSearchText({
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        sku: product.sku,
        storage: product.storage,
        color: product.color,
        carrier: product.carrier,
        brand: product.brand.name,
        category: product.category.name,
        specs: product.specs,
      }),
    },
  });
}

/** Reconstruit l'index de tout le catalogue (maintenance depuis le back-office). */
export async function rebuildSearchIndex(): Promise<number> {
  const products = await db.product.findMany({ select: { id: true } });
  for (const product of products) {
    await syncProductSearchText(product.id);
  }
  return products.length;
}
