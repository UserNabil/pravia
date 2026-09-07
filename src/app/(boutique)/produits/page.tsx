import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFacets, listProducts } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { SortSelect } from "@/components/sort-select";
import { Pagination } from "@/components/pagination";
import { formatNumber } from "@/lib/format";
import { SORT_OPTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Parcourez tout le catalogue Pravia : smartphones, ordinateurs, audio, gaming.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const asString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const page = Number(asString(sp.page) ?? 1);
  const sort = asString(sp.tri) ?? "best-sellers";
  const category = asString(sp.categorie);
  const q = asString(sp.q);
  const priceMax = asString(sp.prix_max);

  const [facets, result, user] = await Promise.all([
    getFacets(),
    listProducts({
      q,
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
  ]);

  const wishlist = user
    ? await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })
    : [];
  const wishlistIds = new Set(wishlist.map((w) => w.productId));

  const activeCategory = facets.categories.find((c) => c.slug === category);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Meilleures ventes";

  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page" || value === undefined) continue;
    for (const item of asArray(value)) baseParams.append(key, item);
  }

  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.total);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-2">
        <Link href="/" className="transition-colors hover:text-foreground">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/produits" className="transition-colors hover:text-foreground">
          Catalogue
        </Link>
        {activeCategory && (
          <>
            <span>/</span>
            <span className="text-foreground">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? `Resultats pour "${q}"` : (activeCategory?.name ?? "Tout le catalogue")}
        </h1>
        {activeCategory?.description && !q && (
          <p className="mt-1 text-sm text-muted">{activeCategory.description}</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row-reverse lg:items-start">
        <Suspense fallback={<div className="hidden w-72 shrink-0 lg:block" />}>
          <CatalogFilters facets={facets} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <Suspense fallback={<div className="h-8 w-44 rounded-lg bg-surface-2" />}>
              <SortSelect />
            </Suspense>
            <p className="text-xs text-muted-2">
              {result.total > 0 ? (
                <>
                  {from}-{to} sur {formatNumber(result.total)} resultats
                  <span className="hidden sm:inline"> — {sortLabel}</span>
                </>
              ) : (
                "Aucun resultat"
              )}
            </p>
          </div>

          {result.products.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
                <PackageSearch className="size-6" />
              </span>
              <h2 className="text-base font-semibold">Aucun produit ne correspond</h2>
              <p className="max-w-sm text-sm text-muted-2">
                Essayez d&apos;elargir vos criteres : retirez un filtre de marque, augmentez le budget
                maximum ou reformulez votre recherche.
              </p>
              <Link href="/produits" className="btn btn-primary mt-1">
                Reinitialiser les filtres
              </Link>
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
