"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { useToast } from "./toast";
import { formatPrice } from "@/lib/format";

export function CartLine({
  item,
}: {
  item: {
    id: string;
    quantity: number;
    product: {
      slug: string;
      title: string;
      price: number;
      stock: number;
      minOrder: number;
      brand: { name: string };
      images: { url: string; alt: string }[];
    };
  };
}) {
  const t = useTranslations("cart");
  const tToast = useTranslations("toast");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function update(quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction(item.id, quantity);
      if (!result.ok) toast(tToast(result.messageKey, result.values), "error");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemAction(item.id);
      toast(tToast(result.messageKey, result.values), result.ok ? "success" : "error");
      router.refresh();
    });
  }

  const image = item.product.images[0];

  return (
    <div className="flex gap-4 p-4">
      <Link
        href={`/produits/${item.product.slug}`}
        className="size-20 shrink-0 rounded-xl bg-surface-2 p-2 sm:size-24"
      >
        {image && (
          <Image
            src={image.url}
            alt={image.alt || item.product.title}
            width={120}
            height={120}
            className="size-full object-contain"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/produits/${item.product.slug}`}
            className="line-clamp-2 text-sm font-semibold transition-colors hover:text-primary"
          >
            {item.product.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-2">{item.product.brand.name}</p>
          <p className="mt-1 text-sm font-medium">{formatPrice(item.product.price)}</p>
          {item.quantity > item.product.stock && (
            <p className="mt-1 text-xs text-danger">
              Stock insuffisant : {item.product.stock} disponible(s)
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <div className="flex items-center rounded-lg border border-border bg-surface-2">
            <button
              type="button"
              onClick={() => update(item.quantity - 1)}
              disabled={pending}
              aria-label="Diminuer la quantite"
              className="flex size-8 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">
              {pending ? <Loader2 className="mx-auto size-3.5 animate-spin" /> : item.quantity}
            </span>
            <button
              type="button"
              onClick={() => update(item.quantity + 1)}
              disabled={pending || item.quantity >= item.product.stock}
              aria-label="Augmenter la quantite"
              className="flex size-8 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <p className="text-sm font-bold tabular-nums sm:order-first">
            {formatPrice(item.product.price * item.quantity)}
          </p>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Retirer du panier"
            className="flex size-8 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
