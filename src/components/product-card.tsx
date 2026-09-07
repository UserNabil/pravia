import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";
import { RatingBadge } from "./stars";
import { AddToCartButton } from "./add-to-cart";
import { WishlistButton } from "./wishlist-button";
import { formatPrice, cn } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/constants";

export type ProductCardProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  condition: string;
  storage: string | null;
  color: string | null;
  carrier: string | null;
  tradeAssurance: boolean;
  rating: number;
  reviewCount: number;
  brand: { name: string };
  images: { url: string; alt: string }[];
};

export function ProductCard({
  product,
  inWishlist = false,
  priority = false,
}: {
  product: ProductCardProduct;
  inWishlist?: boolean;
  priority?: boolean;
}) {
  const image = product.images[0];
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  const attributes = [product.carrier, product.storage, product.color].filter(Boolean).join(" | ");

  return (
    <article className="group surface-card flex flex-col overflow-hidden transition-colors hover:border-border-strong">
      <div className="relative">
        <Link
          href={`/produits/${product.slug}`}
          className="block aspect-square bg-surface-2 p-4"
          aria-label={product.title}
        >
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || product.title}
              width={400}
              height={400}
              priority={priority}
              className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-2">
              Aucun visuel
            </div>
          )}
        </Link>

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {discount > 0 && (
            <span className="chip bg-danger/15 text-danger">-{discount}%</span>
          )}
          {product.condition !== "NEW" && (
            <span className="chip bg-surface-3 text-muted">{CONDITION_LABELS[product.condition]}</span>
          )}
          {product.stock === 0 && (
            <span className="chip bg-surface-3 text-muted">Rupture</span>
          )}
        </div>

        <div className="absolute right-2.5 top-2.5">
          <WishlistButton productId={product.id} active={inWishlist} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/produits/${product.slug}`}
            className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug transition-colors hover:text-primary"
          >
            {product.title}
          </Link>
          <RatingBadge rating={product.rating} />
        </div>

        <div className="mt-auto space-y-1">
          <p className="text-xs text-muted-2">Total</p>
          <p className="flex flex-wrap items-baseline gap-1.5 text-sm">
            <span className="text-muted-2">A partir de</span>
            <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <span className="text-xs text-muted-2 line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </p>
        </div>

        {attributes && (
          <p className="truncate border-t border-border pt-2.5 text-xs text-muted-2">
            {attributes}
            <Link
              href={`/produits/${product.slug}`}
              className="ml-1.5 font-medium text-primary hover:underline"
            >
              En savoir plus
            </Link>
          </p>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <AddToCartButton
            productId={product.id}
            disabled={product.stock === 0}
            className="flex-1"
            size="sm"
          />
          {product.tradeAssurance && (
            <span
              title="Trade Assurance : paiement et livraison garantis"
              className={cn("chip shrink-0 bg-primary-soft text-primary")}
            >
              <ShieldCheck className="size-3" />
              <Zap className="size-3" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
