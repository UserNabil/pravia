import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, PackageCheck, RotateCcw, ShieldCheck, Truck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { ProductGallery } from "@/components/product-gallery";
import { BuyBox } from "@/components/buy-box";
import { ProductCard } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";
import { formatPrice, formatDate, cn } from "@/lib/format";
import { CONDITION_LABELS, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { breadcrumbSchema, buildMetadata, getSiteUrl, jsonLd, productSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: {
      title: true,
      subtitle: true,
      description: true,
      price: true,
      stock: true,
      active: true,
      metaTitle: true,
      metaDescription: true,
      ogImage: true,
      noIndex: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!product) return { title: "Produit introuvable", robots: { index: false, follow: false } };

  const price = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(product.price / 100);

  return buildMetadata({
    title: product.metaTitle?.trim() || `${product.title} - ${product.brand.name}`,
    description:
      product.metaDescription?.trim() ||
      `${product.subtitle ?? product.description} A partir de ${price}, ${
        product.stock > 0 ? "en stock" : "bientot disponible"
      }, garanti et livre en 48 h.`,
    path: `/produits/${slug}`,
    image: product.ogImage,
    // Un produit depublie ou explicitement exclu ne doit pas rester indexe.
    noIndex: product.noIndex || !product.active,
    type: "article",
    // Chaque fiche a son visuel social genere dans le meme segment.
    useSegmentImage: !product.ogImage,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.active) notFound();

  const user = await getCurrentUser();

  const [related, wishlisted, ownReview, siteUrl] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId),
    user
      ? db.wishlistItem.findUnique({
          where: { userId_productId: { userId: user.id, productId: product.id } },
        })
      : null,
    user
      ? db.review.findUnique({
          where: { productId_userId: { productId: product.id, userId: user.id } },
        })
      : null,
    getSiteUrl(),
  ]);

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  const freeShipping = product.price >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      {/* Fiche produit exploitable en resultat enrichi : prix, stock, avis. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            productSchema({
              siteUrl,
              product,
              rating: product.rating,
              reviewCount: product.reviewCount,
              reviews: product.reviews,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema(siteUrl, [
              { name: "Accueil", path: "/" },
              { name: "Catalogue", path: "/produits" },
              { name: product.category.name, path: `/produits?categorie=${product.category.slug}` },
              { name: product.title, path: `/produits/${product.slug}` },
            ])
          ),
        }}
      />

      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-2">
        <Link href="/" className="transition-colors hover:text-foreground">
          Accueil
        </Link>
        <span>/</span>
        <Link href="/produits" className="transition-colors hover:text-foreground">
          Catalogue
        </Link>
        <span>/</span>
        <Link
          href={`/produits?categorie=${product.category.slug}`}
          className="transition-colors hover:text-foreground"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{product.title}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] xl:gap-12">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/produits?marque=${product.brand.slug}`}
              className="chip bg-surface-2 text-muted transition-colors hover:text-foreground"
            >
              {product.brand.name}
            </Link>
            {product.condition !== "NEW" && (
              <span className="chip bg-warning/15 text-warning">
                {CONDITION_LABELS[product.condition]}
              </span>
            )}
            {product.tradeAssurance && (
              <span className="chip bg-primary-soft text-primary">
                <ShieldCheck className="size-3" />
                Trade Assurance
              </span>
            )}
          </div>

          <h1 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">{product.title}</h1>
          {product.subtitle && <p className="mt-1.5 text-sm text-muted">{product.subtitle}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Stars rating={product.rating} size="md" showValue count={product.reviewCount} />
            <span className="text-xs text-muted-2">Ref. {product.sku}</span>
            <span className="text-xs text-muted-2">{product.soldCount} vendus</span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <>
                <span className="text-base text-muted-2 line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
                <span className="chip bg-danger/15 text-danger">-{discount}%</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-2">TVA incluse, hors frais de livraison</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {product.stock > 0 ? (
              <>
                <CheckCircle2 className="size-4 text-success" />
                <span className="text-success">
                  En stock
                  {product.stock <= 10 && (
                    <span className="text-warning"> — plus que {product.stock} disponibles</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <XCircle className="size-4 text-danger" />
                <span className="text-danger">Rupture de stock</span>
              </>
            )}
          </div>

          <div className="mt-5">
            <BuyBox
              productId={product.id}
              price={product.price}
              stock={product.stock}
              minOrder={product.minOrder}
              inWishlist={Boolean(wishlisted)}
            />
          </div>

          <div className="surface-card mt-5 divide-y divide-border">
            <Perk
              Icon={Truck}
              title={freeShipping ? "Livraison offerte" : "Livraison 9,90 EUR"}
              text={
                freeShipping
                  ? "Expedition sous 24 h, livraison en 2 a 3 jours ouvres"
                  : `Offerte des ${formatPrice(FREE_SHIPPING_THRESHOLD)} d'achat`
              }
            />
            <Perk
              Icon={ShieldCheck}
              title={`Garantie ${product.warrantyMonths} mois`}
              text="Prise en charge complete piece et main d'oeuvre"
            />
            <Perk
              Icon={RotateCcw}
              title="Retour gratuit 30 jours"
              text="Remboursement sous 5 jours ouvres apres reception"
            />
            {product.readyToShip && (
              <Perk
                Icon={PackageCheck}
                title="Expedition immediate"
                text="Commande validee avant 15h expediee le jour meme"
              />
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- description */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr] xl:gap-12">
        <section>
          <h2 className="text-lg font-bold tracking-tight">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
            {product.description}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold tracking-tight">Caracteristiques</h2>
          <dl className="surface-card mt-3 divide-y divide-border">
            {product.specs.map((spec) => (
              <div key={spec.id} className="flex gap-4 px-4 py-2.5 text-sm">
                <dt className="w-2/5 shrink-0 text-muted-2">{spec.label}</dt>
                <dd className="font-medium">{spec.value}</dd>
              </div>
            ))}
            <div className="flex gap-4 px-4 py-2.5 text-sm">
              <dt className="w-2/5 shrink-0 text-muted-2">Etat</dt>
              <dd className="font-medium">{CONDITION_LABELS[product.condition]}</dd>
            </div>
            {product.storage && (
              <div className="flex gap-4 px-4 py-2.5 text-sm">
                <dt className="w-2/5 shrink-0 text-muted-2">Stockage</dt>
                <dd className="font-medium">{product.storage}</dd>
              </div>
            )}
            {product.color && (
              <div className="flex gap-4 px-4 py-2.5 text-sm">
                <dt className="w-2/5 shrink-0 text-muted-2">Coloris</dt>
                <dd className="font-medium">{product.color}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* -------------------------------------------------------- avis */}
      <section className="mt-12">
        <h2 className="text-lg font-bold tracking-tight">
          Avis clients{" "}
          <span className="font-normal text-muted-2">({product.reviewCount})</span>
        </h2>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-5">
            <div className="surface-card p-5">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold tabular-nums">
                  {product.rating > 0 ? product.rating.toFixed(1) : "-"}
                </span>
                <div>
                  <Stars rating={product.rating} size="md" />
                  <p className="mt-1 text-xs text-muted-2">
                    Base sur {product.reviewCount} avis verifie{product.reviewCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {product.distribution.map((row) => {
                  const share = product.reviewCount ? (row.count / product.reviewCount) * 100 : 0;
                  return (
                    <div key={row.stars} className="flex items-center gap-2.5 text-xs">
                      <span className="w-8 shrink-0 tabular-nums text-muted-2">{row.stars} *</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-star transition-all"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right tabular-nums text-muted-2">
                        {row.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ReviewForm
              productId={product.id}
              productSlug={product.slug}
              isAuthenticated={Boolean(user)}
              existingReview={ownReview}
            />
          </div>

          <div className="space-y-3">
            {product.reviews.length === 0 ? (
              <div className="surface-card px-5 py-10 text-center text-sm text-muted-2">
                Aucun avis publie pour l&apos;instant. Soyez le premier a donner le votre.
              </div>
            ) : (
              product.reviews.map((review) => (
                <article key={review.id} className="surface-card p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: review.user.avatarColor }}
                    >
                      {review.user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{review.user.name}</p>
                        <span className="text-xs text-muted-2">{formatDate(review.createdAt)}</span>
                      </div>
                      <Stars rating={review.rating} size="xs" />
                      <p className="mt-1.5 text-sm font-medium">{review.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{review.body}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- similaires */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight">Dans la meme categorie</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Perk({
  Icon,
  title,
  text,
  className,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 p-3.5", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-2">{text}</p>
      </div>
    </div>
  );
}
