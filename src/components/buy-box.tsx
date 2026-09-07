"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "./add-to-cart";
import { WishlistButton } from "./wishlist-button";
import { formatPrice } from "@/lib/format";

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
  const [quantity, setQuantity] = useState(Math.max(1, minOrder));
  const clamp = (value: number) => Math.min(Math.max(value, minOrder), Math.max(stock, minOrder));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-surface-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => clamp(q - 1))}
            disabled={quantity <= minOrder || stock === 0}
            aria-label="Diminuer la quantite"
            className="flex size-9 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            value={quantity}
            min={minOrder}
            max={stock}
            onChange={(event) => setQuantity(clamp(Number(event.target.value) || minOrder))}
            aria-label="Quantite"
            className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => clamp(q + 1))}
            disabled={quantity >= stock}
            aria-label="Augmenter la quantite"
            className="flex size-9 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {quantity > 1 && (
          <p className="text-sm text-muted">
            Sous-total{" "}
            <span className="font-semibold text-foreground">{formatPrice(price * quantity)}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <AddToCartButton
          productId={productId}
          quantity={quantity}
          disabled={stock === 0}
          size="lg"
          label="Ajouter au panier"
          className="flex-1 sm:flex-none sm:px-8"
        />
        <WishlistButton productId={productId} active={inWishlist} variant="button" />
      </div>
    </div>
  );
}
