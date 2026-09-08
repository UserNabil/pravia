import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFormat } from "@/lib/server-format";
import { ArrowRight, Flame, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRatings } from "@/lib/queries";
import { getTranslatedCategoriesWithCounts, resolveProduct, translationFilter } from "@/lib/content";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { ModeEdition, TexteEditable } from "@/components/editable-text";
import { getHomeContent } from "@/lib/home-content";
import { buildPageMetadata } from "@/lib/seo";
import { toLocale, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "meta" });

  const metadata = await buildPageMetadata("/", locale, {
    title: t("defaultTitle"),
    description: t("defaultDescription"),
  });

  // L'accueil porte le titre complet, sans le gabarit « %s | Pravia ».
  return { ...metadata, title: { absolute: metadata.title as string } };
}

const productInclude = (locale: Locale) => ({
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
  translations: translationFilter(locale),
});

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const [{ locale: rawLocale }, { edition }] = await Promise.all([params, searchParams]);
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);

  const [t, tCommon, tEditeur, format, user] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("homeEditor"),
    getFormat(),
    getCurrentUser(),
  ]);

  const include = productInclude(locale);

  const [featured, newest, deals, categories, stats, wishlist] = await Promise.all([
    db.product.findMany({
      where: { active: true, featured: true },
      orderBy: { soldCount: "desc" },
      take: 8,
      include,
    }),
    db.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 4, include }),
    db.product.findMany({
      where: { active: true, compareAtPrice: { not: null } },
      orderBy: { soldCount: "desc" },
      take: 3,
      include,
    }),
    getTranslatedCategoriesWithCounts(locale),
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
  const ratings = await getRatings([...featured, ...newest, ...deals].map((p) => p.id));

  // resolveProduct applique la traduction ; le score d avis vient de l agregat.
  const decorate = <T extends Parameters<typeof resolveProduct>[0] & { id: string }>(product: T) => {
    const resolved = resolveProduct(product);
    return {
      ...resolved,
      rating: ratings.get(product.id)?.average ?? 0,
      reviewCount: ratings.get(product.id)?.count ?? 0,
    };
  };

  const [productCount, brandCount, orderCount] = stats;

  // La banniere se lit depuis les reglages, avec le catalogue pour repli : le
  // client la reecrit depuis la boutique sans qu'on redeploie le site.
  const contenu = await getHomeContent(locale, {
    products: format.number(productCount),
    brands: format.number(brandCount),
  });
  const estAdmin = user?.role === "ADMIN";

  const hero = decorate(featured[0]);
  const price = (value: number) => format.price(value);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
      {/* ------------------------------------------------------------- hero */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-card relative overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-surface p-6 sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1.15fr_1fr]">
            <div>
              <ModeEdition autorise={estAdmin} ouvertParDefaut={edition === "1"}>
              <span className="chip bg-primary-soft text-primary">
                <Sparkles className="size-3" />
                <TexteEditable champ="badge" texte={contenu.badge} />
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                <TexteEditable champ="title" texte={contenu.title} />
                <br />
                <span className="text-primary">
                  <TexteEditable champ="titleAccent" texte={contenu.titleAccent} />
                </span>
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                <TexteEditable
                  champ="subtitle"
                  texte={contenu.subtitle}
                  aide={tEditeur("tokensHint")}
                />
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link href="/produits" className="btn btn-primary px-5 py-2.5">
                  <TexteEditable champ="explore" texte={contenu.explore} />
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </Link>
                <Link href="/produits?tri=best-sellers" className="btn btn-secondary px-5 py-2.5">
                  <TrendingUp className="size-4" />
                  <TexteEditable champ="bestSellers" texte={contenu.bestSellers} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-2">
                <span>{t("ordersHandled", { count: orderCount })}</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-success" />
                  <TexteEditable champ="securePayment" texte={contenu.securePayment} />
                </span>
              </div>
              </ModeEdition>
            </div>

            {hero?.images[0] && (
              <Link href={`/produits/${hero.slug}`} className="group hidden justify-center sm:flex">
                <Image
                  src={hero.images[0].url}
                  alt={hero.title}
                  width={420}
                  height={420}
                  sizes="(max-width: 1024px) 40vw, 19rem"
                  priority
                  className="w-full max-w-[16rem] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 lg:max-w-[19rem]"
                />
              </Link>
            )}
          </div>
        </div>

        <div className="grid content-between gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {deals.map((raw) => {
            const product = decorate(raw);
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
                  <span dir="ltr" className="chip bg-danger/15 text-danger">
                    <Flame className="size-3" />
                    {`-${discount}%`}
                  </span>
                  <p className="mt-1.5 truncate text-sm font-semibold">{product.title}</p>
                  <p className="mt-0.5 text-xs text-muted-2">{product.brand.name}</p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-bold">{price(product.price)}</span>
                    <span className="text-xs text-muted-2 line-through">
                      {price(product.compareAtPrice!)}
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
        <SectionHeading title={t("browseByCategory")} href="/produits" linkLabel={tCommon("seeAll")} />
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
                {t("productCount", { count: category._count.products })}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- vedette */}
      <section className="mt-10">
        <SectionHeading
          title={t("ourSelection")}
          subtitle={t("ourSelectionSub")}
          href="/produits?tri=best-sellers"
          linkLabel={t("bestSellers")}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((raw, index) => (
            <ProductCard
              key={raw.id}
              product={decorate(raw)}
              inWishlist={wishlistIds.has(raw.id)}
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
              {t("assuranceTitle")}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">{t("assuranceText")}</p>
          </div>
          <Link href="/produits?assurance=1" className="btn btn-primary px-5 py-2.5">
            {t("assuranceCta")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------- nouveautes */}
      <section className="mt-10">
        <SectionHeading
          title={t("latest")}
          subtitle={t("latestSub")}
          href="/produits?tri=newest"
          linkLabel={tCommon("seeAll")}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {newest.map((raw) => (
            <ProductCard key={raw.id} product={decorate(raw)} inWishlist={wishlistIds.has(raw.id)} />
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
      <Link href={href} className="inline-flex min-h-6 items-center gap-1 text-sm font-medium text-primary hover:underline">
        {linkLabel}
        <ArrowRight className="size-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
