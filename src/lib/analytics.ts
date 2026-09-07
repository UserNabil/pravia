import "server-only";
import { db } from "./db";

/** Seuls ces statuts comptent comme du chiffre d'affaires realise. */
export const PAID_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

type Breakdown = { label: string; value: number };

/**
 * Chiffre d'affaires par categorie et par marque, calcule sur les lignes de
 * commande reelles plutot que sur le compteur de ventes cumule des produits.
 */
export async function getSalesBreakdown(since?: Date) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        status: { in: PAID_STATUSES },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    },
    select: {
      priceSnapshot: true,
      quantity: true,
      product: {
        select: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      },
    },
  });

  const byCategory = new Map<string, number>();
  const byBrand = new Map<string, number>();

  for (const item of items) {
    // Un produit supprime laisse une ligne orpheline : on l'ignore ici.
    if (!item.product) continue;
    const revenue = item.priceSnapshot * item.quantity;
    const category = item.product.category.name;
    const brand = item.product.brand.name;
    byCategory.set(category, (byCategory.get(category) ?? 0) + revenue);
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + revenue);
  }

  const sort = (map: Map<string, number>, take: number): Breakdown[] =>
    [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, take);

  return { byCategory: sort(byCategory, 6), byBrand: sort(byBrand, 8) };
}

/** Produits les plus vendus, mesures sur les commandes payees. */
export async function getTopProducts(take = 10, since?: Date) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        status: { in: PAID_STATUSES },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      productId: { not: null },
    },
    select: {
      productId: true,
      priceSnapshot: true,
      quantity: true,
      product: {
        select: {
          id: true,
          title: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      },
    },
  });

  const totals = new Map<
    string,
    { id: string; title: string; category: string; brand: string; units: number; revenue: number }
  >();

  for (const item of items) {
    if (!item.product) continue;
    const existing = totals.get(item.product.id) ?? {
      id: item.product.id,
      title: item.product.title,
      category: item.product.category.name,
      brand: item.product.brand.name,
      units: 0,
      revenue: 0,
    };
    existing.units += item.quantity;
    existing.revenue += item.priceSnapshot * item.quantity;
    totals.set(item.product.id, existing);
  }

  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, take);
}
