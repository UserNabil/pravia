"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "./add-to-cart";
import { WishlistButton } from "./wishlist-button";
import { VariantPicker, useVariantes } from "./variant-picker";

export function BuyBox({
  productId,
  price,
  stock,
  minOrder,
  inWishlist,
}: {
  productId: string;
  price: number;
  stock: number;
  minOrder: number;
  inWishlist: boolean;
}) {
  const t = useTranslations("product");
  const format = useFormat();
  const { choisie } = useVariantes();

  // La couleur porte son propre stock et, parfois, son propre prix : ce sont
  // eux qui gouvernent des qu'une teinte est choisie.
  const stockEffectif = choisie ? choisie.stock : stock;
  const prixEffectif = choisie?.price ?? price;

  const [quantity, setQuantity] = useState(Math.max(1, minOrder));
  const clamp = (value: number) =>
    Math.min(Math.max(value, minOrder), Math.max(stockEffectif, minOrder));

  return (
    <div className="space-y-4">
      <VariantPicker />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-surface-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => clamp(q - 1))}
            disabled={quantity <= minOrder || stockEffectif === 0}
            aria-label={t("decrease")}
            className="flex size-9 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            value={quantity}
            min={minOrder}
            max={stockEffectif}
            onChange={(event) => setQuantity(clamp(Number(event.target.value) || minOrder))}
            aria-label={t("quantity")}
            className="h-9 w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => clamp(q + 1))}
            disabled={quantity >= stockEffectif}
            aria-label={t("increase")}
            className="flex size-9 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {quantity > 1 && (
          <p className="text-sm text-muted">
            {t("subtotal")}{" "}
            <span className="font-semibold text-foreground">
              {format.price(prixEffectif * quantity)}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <AddToCartButton
          productId={productId}
          quantity={quantity}
          variantId={choisie?.id ?? null}
          disabled={stockEffectif === 0}
          size="lg"
          label={t("addToCart")}
          className="flex-1 sm:flex-none sm:px-8"
        />
        <WishlistButton productId={productId} active={inWishlist} variant="button" />
      </div>
    </div>
  );
}
