import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  findFallbackProducts,
  getFacets,
  listProducts,
  logSearch,
  resolveQuery,
} from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { SortSelect } from "@/components/sort-select";
import { Pagination } from "@/components/pagination";
import { formatNumber } from "@/lib/format";
import { SORT_OPTIONS } from "@/lib/constants";
import { resolveCategory, translationFilter } from "@/lib/content";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import {
  breadcrumbSchema,
  buildMetadata,
  buildPageMetadata,
  getSiteUrl,
  itemListSchema,
  jsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RouteParams = Promise<{ locale: string }>;

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const asString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Une page de recherche n'a pas vocation a etre indexee : elle produit une
 * infinite d'URL au contenu redondant. Les pages de categorie, elles, sont de
 * vraies pages d'atterrissage.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams]);
  const locale = toLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "catalogue" });

  const q = asString(sp.q);
  const categorySlug = asString(sp.categorie);
  const brandSlug = asString(sp.marque);

  if (q) {
    return buildMetadata({
      title: t("searchTitle", { term: q }),
      description: t("searchDescription", { term: q }),
      path: `/produits?q=${encodeURIComponent(q)}`,
      locale,
      noIndex: true,
    });
  }

  if (categorySlug) {
    const row = await db.category.findUnique({
      where: { slug: categorySlug },
      include: {
        _count: { select: { products: { where: { active: true } } } },
        translations: translationFilter(locale),
      },
    });

    if (row) {
      const category = resolveCategory(row);
      const count = row._count.products;
      return buildMetadata({
        title:
          category.metaTitle?.trim() || t("categoryTitle", { name: category.name, count }),
        description:
          category.metaDescription?.trim() ||
          t("categoryDescription", {
            intro: category.description ?? t("categoryIntro", { name: category.name }),
            count,
          }),
        path: `/produits?categorie=${category.slug}`,
        locale,
        image: category.ogImage,
        noIndex: category.noIndex,
      });
    }
  }

  if (brandSlug) {
    const brand = await db.brand.findUnique({
      where: { slug: brandSlug },
      include: { _count: { select: { products: { where: { active: true } } } } },
    });

    if (brand) {
      return buildMetadata({
        title: t("brandTitle", { name: brand.name, count: brand._count.products }),
        description: t("brandDescription", { name: brand.name }),
        path: `/produits?marque=${brand.slug}`,
        locale,
      });
    }
  }

  // Les URL portant d'autres filtres restent hors index pour eviter les doublons.
  const hasOtherFilters = Boolean(
    sp.condition || sp.prix_max || sp.assurance || sp.dispo || sp.page || sp.tri
  );

  return buildPageMetadata("/produits", locale, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  }).then((metadata) =>
    hasOtherFilters ? { ...metadata, robots: { index: false, follow: true } } : metadata
  );
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams]);
  const locale = toLocale(rawLocale);
  const tag = LOCALE_TAGS[locale];

  const [t, tSort] = await Promise.all([
    getTranslations("catalogue"),
    getTranslations("sort"),
  ]);

  const page = Number(asString(sp.page) ?? 1);
  const sort = asString(sp.tri);
  const category = asString(sp.categorie);
  const priceMax = asString(sp.prix_max);

  const query = await resolveQuery(asString(sp.q));

  const [facets, result, user, siteUrl] = await Promise.all([
    getFacets(locale),
    listProducts({
      locale,
      tokens: query.tokens,
      category,
      brands: asArray(sp.marque),
      conditions: asArray(sp.condition),
      maxPrice: priceMax ? Number(priceMax) : undefined,
      tradeAssurance: asString(sp.assurance) === "1",
      readyToShip: asString(sp.dispo) === "1",
      sort,
      page: Number.isFinite(page) ? page : 1,
      perPage: 12,
    }),
    getCurrentUser(),
    getSiteUrl(),
  ]);

  // Le journal alimente les statistiques de recherche du back-office.
  if (query.term && page <= 1) {
    await logSearch(query.term, result.total);
  }

  // Recherche infructueuse : on propose ce qui s'en approche le plus.
  const fallback =
    query.term && result.total === 0 ? await findFallbackProducts(query.tokens, 4, locale) : [];

  const wishlist = user
    ? await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })
    : [];
  const wishlistIds = new Set(wishlist.map((w) => w.productId));

  const activeCategory = facets.categories.find((c) => c.slug === category);
  const sortKey = sort
    ? (SORT_OPTIONS.find((o) => o.value === sort)?.key ?? "bestSellers")
    : query.term
      ? "relevance"
      : "bestSellers";

  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page" || value === undefined) continue;
    for (const item of asArray(value)) baseParams.append(key, item);
  }

  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.total);

  const trail = [
    { name: t("breadcrumbHome"), path: "/" },
    { name: t("breadcrumbCatalogue"), path: "/produits" },
    ...(activeCategory
      ? [{ name: activeCategory.name, path: `/produits?categorie=${activeCategory.slug}` }]
      : []),
  ];

  const heading = query.term
    ? t("resultsFor", { term: query.term })
    : (activeCategory?.name ?? t("title"));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(siteUrl, locale, trail)) }}
      />
      {result.products.length > 0 && !query.term && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(itemListSchema(siteUrl, locale, result.products)),
          }}
        />
      )}

      <nav
        aria-label={t("breadcrumb")}
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-2"
      >
        {trail.map((step, index) => (
          <span key={step.path} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === trail.length - 1 ? (
              <span className="text-foreground">{step.name}</span>
            ) : (
              <Link
                href={step.path}
                className="inline-flex min-h-6 items-center transition-colors hover:text-foreground"
              >
                {step.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {activeCategory?.description && !query.term && (
          <p className="mt-1 text-sm text-muted">{activeCategory.description}</p>
        )}
        {query.appliedSynonym && (
          <p className="mt-1 text-sm text-muted-2">
            {t("expandedTo", { terms: query.appliedSynonym })}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row-reverse lg:items-start">
        <Suspense fallback={<div className="hidden w-72 shrink-0 lg:block" />}>
          <CatalogFilters facets={facets} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <Suspense fallback={<div className="h-8 w-44 rounded-lg bg-surface-2" />}>
              <SortSelect hasQuery={Boolean(query.term)} />
            </Suspense>
            <p className="text-xs text-muted-2">
              {result.total > 0 ? (
                <>
                  {t("results", { from, to, total: formatNumber(result.total, tag) })}
                  <span className="hidden sm:inline"> — {tSort(sortKey)}</span>
                </>
              ) : (
                t("noResults")
              )}
            </p>
          </div>

          {result.products.length === 0 ? (
            <div className="surface-card px-6 py-12 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
                <PackageSearch className="size-6" />
              </span>
              <h2 className="mt-3 text-base font-semibold">
                {query.term ? t("emptyTitleSearch", { term: query.term }) : t("emptyTitle")}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">{t("emptyText")}</p>
              <Link href="/produits" className="btn btn-primary mt-4">
                {t("emptyCta")}
              </Link>

              {fallback.length > 0 && (
                <div className="mt-8 text-start">
                  <h3 className="text-sm font-bold">{t("suggestions")}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {fallback.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        inWishlist={wishlistIds.has(product.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {result.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  inWishlist={wishlistIds.has(product.id)}
                  priority={index < 4}
                />
              ))}
            </div>
          )}

          <Pagination page={result.page} pageCount={result.pageCount} baseParams={baseParams} />
        </div>
      </div>
    </div>
  );
}
