import "server-only";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { normalize, scoreProduct, tokenize } from "./search";

export type CatalogFilters = {
  category?: string;
  brands?: string[];
  conditions?: string[];
  minPrice?: number;
  maxPrice?: number;
  tradeAssurance?: boolean;
  readyToShip?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
  /** Termes normalises, calcules par resolveQuery(). */
  tokens?: string[];
};

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

  // Chaque terme doit apparaitre dans l'index : on resserre au lieu d'elargir.
  if (filters.tokens?.length) {
    for (const token of filters.tokens) {
      and.push({ searchText: { contains: token } });
    }
  }

  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.brands?.length) and.push({ brand: { slug: { in: filters.brands } } });
  if (filters.conditions?.length) and.push({ condition: { in: filters.conditions } });
  if (filters.tradeAssurance) and.push({ tradeAssurance: true });
  if (filters.readyToShip) and.push({ readyToShip: true, stock: { gt: 0 } });
  if (filters.minPrice !== undefined) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined) and.push({ price: { lte: filters.maxPrice } });

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

const LIST_INCLUDE = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
};

/** Au-dela de cette limite, le classement en memoire ne serait plus tenable. */
const RELEVANCE_SCAN_LIMIT = 300;

/**
 * Transforme la saisie brute en termes de recherche, apres application des
 * synonymes definis au back-office ("pc portable" -> "ordinateur portable").
 */
export async function resolveQuery(raw: string | undefined): Promise<{
  term: string;
  tokens: string[];
  appliedSynonym: string | null;
}> {
  const term = (raw ?? "").trim();
  if (!term) return { term: "", tokens: [], appliedSynonym: null };

  const normalized = normalize(term);
  const tokens = tokenize(term);

  // Une correspondance sur la requete entiere prime : "pc portable" en un bloc.
  const whole = await db.searchSynonym.findUnique({ where: { term: normalized } });
  if (whole) {
    return { term, tokens: tokenize(whole.targets), appliedSynonym: whole.targets };
  }

  // Sinon on remplace terme a terme : "telephone pliable" -> "smartphone pliable".
  const perToken = await db.searchSynonym.findMany({ where: { term: { in: tokens } } });
  if (!perToken.length) return { term, tokens, appliedSynonym: null };

  const replacements = new Map(perToken.map((row) => [row.term, row.targets]));
  const expanded: string[] = [];
  for (const token of tokens) {
    const target = replacements.get(token);
    if (target) expanded.push(...tokenize(target));
    else expanded.push(token);
  }

  const unique = [...new Set(expanded)];
  return {
    term,
    tokens: unique,
    appliedSynonym: unique.join(" ") === tokens.join(" ") ? null : unique.join(" "),
  };
}

export async function listProducts(filters: CatalogFilters) {
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const isSearch = Boolean(filters.tokens?.length);

  // Hors recherche, ou si l'internaute a choisi un tri explicite, la base
  // pagine elle-meme. La pertinence, elle, se calcule sur l'ensemble des
  // resultats : elle impose donc un classement en memoire.
  const rankByRelevance = isSearch && !filters.sort;
  const where = buildWhere(filters);

  if (!rankByRelevance) {
    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: ORDER_BY[filters.sort ?? "best-sellers"] ?? ORDER_BY["best-sellers"],
        skip: (page - 1) * perPage,
        take: perPage,
        include: LIST_INCLUDE,
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

  const matches = await db.product.findMany({
    where,
    take: RELEVANCE_SCAN_LIMIT,
    include: LIST_INCLUDE,
  });

  const tokens = filters.tokens ?? [];
  const ordered = matches
    .map((row) => ({ row, score: scoreProduct(row, tokens) }))
    .sort((a, b) => b.score - a.score || b.row.soldCount - a.row.soldCount)
    .map((entry) => entry.row);

  const pageRows = ordered.slice((page - 1) * perPage, page * perPage);
  const ratings = await getRatings(pageRows.map((r) => r.id));

  return {
    products: pageRows.map((row) => ({
      ...row,
      rating: ratings.get(row.id)?.average ?? 0,
      reviewCount: ratings.get(row.id)?.count ?? 0,
    })),
    total: ordered.length,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(ordered.length / perPage)),
  };
}

/**
 * Suggestions de repli quand une recherche ne donne rien : on relache la
 * contrainte et on garde les produits qui repondent a au moins un terme.
 */
export async function findFallbackProducts(tokens: string[], take = 4) {
  if (!tokens.length) return [];

  const rows = await db.product.findMany({
    where: {
      active: true,
      OR: tokens.map((token) => ({ searchText: { contains: token } })),
    },
    take: RELEVANCE_SCAN_LIMIT,
    include: LIST_INCLUDE,
  });

  const ordered = rows
    .map((row) => ({ row, score: scoreProduct(row, tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((entry) => entry.row);

  const ratings = await getRatings(ordered.map((r) => r.id));
  return ordered.map((row) => ({
    ...row,
    rating: ratings.get(row.id)?.average ?? 0,
    reviewCount: ratings.get(row.id)?.count ?? 0,
  }));
}

/** Autocompletion de la barre de recherche : produits, categories et marques. */
export async function getSearchSuggestions(raw: string, limit = 6) {
  const tokens = tokenize(raw);
  if (!tokens.length) return { products: [], categories: [], brands: [] };

  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      where: {
        active: true,
        AND: tokens.map((token) => ({ searchText: { contains: token } })),
      },
      take: RELEVANCE_SCAN_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        sku: true,
        soldCount: true,
        subtitle: true,
        searchText: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    db.category.findMany({ select: { slug: true, name: true } }),
    db.brand.findMany({ select: { slug: true, name: true } }),
  ]);

  const ranked = products
    .map((product) => ({ product, score: scoreProduct(product, tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);

  const matches = (name: string) => tokens.some((token) => normalize(name).includes(token));

  return {
    products: ranked,
    categories: categories.filter((c) => matches(c.name)).slice(0, 3),
    brands: brands.filter((b) => matches(b.name)).slice(0, 3),
  };
}

/** Journalise une recherche pour alimenter les statistiques du back-office. */
export async function logSearch(term: string, results: number) {
  const clean = term.trim();
  if (clean.length < 2 || clean.length > 120) return;

  await db.searchQuery.create({
    data: { term: clean, normalized: normalize(clean), results },
  });
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
