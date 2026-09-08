import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getFormat } from "@/lib/server-format";
import { ShieldCheck, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RatingBadge } from "./stars";
import { AddToCartButton } from "./add-to-cart";
import { WishlistButton } from "./wishlist-button";
import { cn } from "@/lib/format";

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

export async function ProductCard({
  product,
  inWishlist = false,
  priority = false,
}: {
  product: ProductCardProduct;
  inWishlist?: boolean;
  priority?: boolean;
}) {
  const [t, tCondition, tCommon, format] = await Promise.all([
    getTranslations("product"),
    getTranslations("condition"),
    getTranslations("common"),
    getFormat(),
  ]);

  const image = product.images[0];
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  const attributes = [product.carrier, product.storage, product.color].filter(Boolean).join(" | ");
  const price = (value: number) => format.price(value);

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
              sizes="(max-width: 640px) 45vw, (max-width: 1280px) 30vw, 22vw"
              priority={priority}
              className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-2">
              {t("noImage")}
            </div>
          )}
        </Link>

        <div className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1">
          {discount > 0 && (
            <span dir="ltr" className="chip bg-danger/15 text-danger">
              {`-${discount}%`}
            </span>
          )}
          {product.condition !== "NEW" && (
            <span className="chip bg-surface-3 text-muted">{tCondition(product.condition)}</span>
          )}
          {product.stock === 0 && (
            <span className="chip bg-surface-3 text-muted">{tCommon("outOfStock")}</span>
          )}
        </div>

        <div className="absolute end-2.5 top-2.5">
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
          <p className="text-xs text-muted-2">{tCommon("total")}</p>
          <p className="flex flex-wrap items-baseline gap-1.5 text-sm">
            <span className="text-muted-2">{tCommon("from")}</span>
            <span className="text-base font-bold text-foreground">{price(product.price)}</span>
            {discount > 0 && (
              <span className="text-xs text-muted-2 line-through">{price(product.compareAtPrice!)}</span>
            )}
          </p>
        </div>

        {attributes && (
          <p className="truncate border-t border-border pt-2.5 text-xs text-muted-2">
            {attributes}
            <Link
              href={`/produits/${product.slug}`}
              className="ms-1.5 font-medium text-primary hover:underline"
            >
              {tCommon("learnMore")}
            </Link>
          </p>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <AddToCartButton productId={product.id} disabled={product.stock === 0} className="flex-1" size="sm" />
          {product.tradeAssurance && (
            <span
              title="Trade Assurance"
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
