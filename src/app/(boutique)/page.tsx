import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRatings } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { formatPrice, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
};

export default async function HomePage() {
  const user = await getCurrentUser();

  const [featured, newest, deals, categories, stats, wishlist] = await Promise.all([
    db.product.findMany({
      where: { active: true, featured: true },
      orderBy: { soldCount: "desc" },
      take: 8,
      include: PRODUCT_INCLUDE,
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: PRODUCT_INCLUDE,
    }),
    db.product.findMany({
      where: { active: true, compareAtPrice: { not: null } },
      orderBy: { soldCount: "desc" },
      take: 4,
      include: PRODUCT_INCLUDE,
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    Promise.all([
      db.product.count({ where: { active: true } }),
      db.brand.count(),
      db.order.count(),
    ]),
    user
      ? db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })
      : Promise.resolve([]),
  ]);

  const wishlistIds = new Set(wishlist.map((w) => w.productId));
  const allIds = [...featured, ...newest, ...deals].map((p) => p.id);
  const ratings = await getRatings(allIds);

  const decorate = <T extends { id: string }>(product: T) => ({
    ...product,
    rating: ratings.get(product.id)?.average ?? 0,
    reviewCount: ratings.get(product.id)?.count ?? 0,
  });

  const [productCount, brandCount, orderCount] = stats;
  const hero = featured[0];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
      {/* ------------------------------------------------------------- hero */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-card relative overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-surface p-6 sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1.15fr_1fr]">
            <div>
              <span className="chip bg-primary-soft text-primary">
                <Sparkles className="size-3" />
                Selection de la semaine
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Le meilleur du high-tech,
                <br />
                <span className="text-primary">neuf ou reconditionne.</span>
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                {formatNumber(productCount)} references, {brandCount} marques, garanties jusqu&apos;a
                24 mois et livraison offerte des 150 EUR.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link href="/produits" className="btn btn-primary px-5 py-2.5">
                  Explorer le catalogue
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/produits?tri=best-sellers" className="btn btn-secondary px-5 py-2.5">
                  <TrendingUp className="size-4" />
                  Meilleures ventes
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-2">
                <span>{formatNumber(orderCount)} commandes traitees</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-success" />
                  Paiement securise
                </span>
              </div>
            </div>

            {hero?.images[0] && (
              <Link href={`/produits/${hero.slug}`} className="group hidden justify-center sm:flex">
                <Image
                  src={hero.images[0].url}
                  alt={hero.title}
                  width={420}
                  height={420}
                  priority
                  className="w-full max-w-[16rem] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 lg:max-w-[19rem]"
                />
              </Link>
            )}
          </div>
        </div>

        <div className="grid content-between gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {deals.slice(0, 3).map((product) => {
            const discount = product.compareAtPrice
              ? Math.round((1 - product.price / product.compareAtPrice) * 100)
              : 0;
            return (
              <Link
                key={product.id}
                href={`/produits/${product.slug}`}
                className="surface-card group flex items-center gap-4 overflow-hidden p-4 transition-colors hover:border-border-strong"
              >
                <div className="size-24 shrink-0 rounded-xl bg-surface-2 p-2">
                  {product.images[0] && (
                    <Image
                      src={product.images[0].url}
                      alt={product.title}
                      width={160}
                      height={160}
                      className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="chip bg-danger/15 text-danger">
                    <Flame className="size-3" />
                    -{discount}%
                  </span>
                  <p className="mt-1.5 truncate text-sm font-semibold">{product.title}</p>
                  <p className="mt-0.5 text-xs text-muted-2">{product.brand.name}</p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-bold">{formatPrice(product.price)}</span>
                    <span className="text-xs text-muted-2 line-through">
                      {formatPrice(product.compareAtPrice!)}
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------- categories */}
      <section className="mt-10">
        <SectionHeading title="Parcourir par categorie" href="/produits" linkLabel="Tout voir" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/produits?categorie=${category.slug}`}
              className="surface-card group flex flex-col items-center gap-2.5 p-4 text-center transition-colors hover:border-primary"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors group-hover:bg-primary-soft group-hover:text-primary">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              <span className="text-xs font-semibold leading-tight">{category.name}</span>
              <span className="text-[0.6875rem] text-muted-2">
                {category._count.products} produits
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- vedette */}
      <section className="mt-10">
        <SectionHeading
          title="Notre selection"
          subtitle="Les produits plebiscites par nos clients"
          href="/produits?tri=best-sellers"
          linkLabel="Meilleures ventes"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((product, index) => (
            <ProductCard
              key={product.id}
              product={decorate(product)}
              inWishlist={wishlistIds.has(product.id)}
              priority={index < 4}
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- bandeau */}
      <section className="surface-card mt-10 overflow-hidden bg-gradient-to-r from-surface via-surface to-primary-soft p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="chip bg-success/15 text-success">
              <ShieldCheck className="size-3" />
              Trade Assurance
            </span>
            <h2 className="mt-2.5 text-xl font-bold tracking-tight sm:text-2xl">
              Achetez l&apos;esprit tranquille
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Paiement protege, produit conforme ou rembourse, et livraison suivie de bout en bout sur
              tous les articles portant le label Trade Assurance.
            </p>
          </div>
          <Link href="/produits?assurance=1" className="btn btn-primary px-5 py-2.5">
            Voir les produits couverts
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------- nouveautes */}
      <section className="mt-10">
        <SectionHeading
          title="Derniers arrivages"
          subtitle="Les references ajoutees recemment au catalogue"
          href="/produits?tri=newest"
          linkLabel="Tout voir"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {newest.map((product) => (
            <ProductCard
              key={product.id}
              product={decorate(product)}
              inWishlist={wishlistIds.has(product.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-[1.375rem]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-2">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {linkLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
