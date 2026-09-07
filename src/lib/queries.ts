import "server-only";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export type CatalogFilters = {
  q?: string;
  category?: string;
  brands?: string[];
  conditions?: string[];
  minPrice?: number;
  maxPrice?: number;
  minOrderMax?: number;
  tradeAssurance?: boolean;
  readyToShip?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

export type ProductCardData = Awaited<ReturnType<typeof listProducts>>["products"][number];

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  "best-sellers": [{ soldCount: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  rating: [{ soldCount: "desc" }],
};

function buildWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true };
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.q) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { title: { contains: q } },
        { subtitle: { contains: q } },
        { description: { contains: q } },
        { sku: { contains: q } },
        { brand: { name: { contains: q } } },
        { category: { name: { contains: q } } },
      ],
    });
  }

  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.brands?.length) and.push({ brand: { slug: { in: filters.brands } } });
  if (filters.conditions?.length) and.push({ condition: { in: filters.conditions } });
  if (filters.tradeAssurance) and.push({ tradeAssurance: true });
  if (filters.readyToShip) and.push({ readyToShip: true, stock: { gt: 0 } });
  if (filters.minPrice !== undefined) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined) and.push({ price: { lte: filters.maxPrice } });
  if (filters.minOrderMax !== undefined) and.push({ price: { lte: filters.minOrderMax } });

  if (and.length) where.AND = and;
  return where;
}

/** Note moyenne et volume d'avis publies, calcules en une requete groupee. */
export async function getRatings(productIds: string[]) {
  if (!productIds.length) return new Map<string, { average: number; count: number }>();

  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    rows.map((row) => [
      row.productId,
      { average: Math.round((row._avg.rating ?? 0) * 10) / 10, count: row._count.rating },
    ])
  );
}

export async function listProducts(filters: CatalogFilters) {
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: ORDER_BY[filters.sort ?? "best-sellers"] ?? ORDER_BY["best-sellers"],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
      },
    }),
    db.product.count({ where }),
  ]);

  const ratings = await getRatings(rows.map((r) => r.id));

  let products = rows.map((row) => ({
    ...row,
    rating: ratings.get(row.id)?.average ?? 0,
    reviewCount: ratings.get(row.id)?.count ?? 0,
  }));

  // Le tri par note s'applique apres agregation, la moyenne n'etant pas stockee.
  if (filters.sort === "rating") {
    products = [...products].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }

  return {
    products,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      specs: { orderBy: { sortOrder: "asc" } },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, avatarColor: true } } },
      },
    },
  });

  if (!product) return null;

  const count = product.reviews.length;
  const average = count
    ? Math.round((product.reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: product.reviews.filter((r) => r.rating === stars).length,
  }));

  return { ...product, rating: average, reviewCount: count, distribution };
}

export async function getRelatedProducts(productId: string, categoryId: string, take = 4) {
  const rows = await db.product.findMany({
    where: { categoryId, active: true, id: { not: productId } },
    orderBy: { soldCount: "desc" },
    take,
    include: {
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const ratings = await getRatings(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    rating: ratings.get(row.id)?.average ?? 0,
    reviewCount: ratings.get(row.id)?.count ?? 0,
  }));
}

/** Facettes affichees dans le panneau de filtres, avec le nombre de produits. */
export async function getFacets() {
  const [categories, brands, priceRange, conditions] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.product.aggregate({ where: { active: true }, _min: { price: true }, _max: { price: true } }),
    db.product.groupBy({ by: ["condition"], where: { active: true }, _count: { condition: true } }),
  ]);

  return {
    categories,
    brands: brands.filter((b) => b._count.products > 0),
    minPrice: priceRange._min.price ?? 0,
    maxPrice: priceRange._max.price ?? 500000,
    conditions,
  };
}

export async function getCartWithProducts(userId: string) {
  const items = await db.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        include: {
          brand: { select: { name: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, count };
}

export async function getCartCount(userId: string) {
  const result = await db.cartItem.aggregate({ where: { userId }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
