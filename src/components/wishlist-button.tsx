"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { toggleWishlistAction } from "@/app/actions/cart";
import { useToast } from "./toast";
import { cn } from "@/lib/format";

export function WishlistButton({
  productId,
  active,
  variant = "icon",
}: {
  productId: string;
  active: boolean;
  variant?: "icon" | "button";
}) {
  const t = useTranslations("product");
  const tToast = useTranslations("toast");
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);
  const toast = useToast();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleWishlistAction(productId);
      toast(tToast(result.messageKey, result.values), result.ok ? "success" : "error");
      if (result.requiresAuth) router.push("/connexion?redirectTo=/favoris");
      else router.refresh();
    });
  }

  if (variant === "button") {
    return (
      <button type="button" onClick={handleClick} disabled={pending} className="btn btn-secondary">
        <Heart className={cn("size-4", optimistic && "fill-danger text-danger")} />
        <span>{optimistic ? t("inFavourites") : t("addToFavourites")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={optimistic ? t("removeFromFavourites") : t("addToFavourites")}
      aria-pressed={optimistic}
      className="flex size-8 items-center justify-center rounded-full border border-border bg-surface/85 backdrop-blur transition-colors hover:bg-surface-3"
    >
      <Heart
        className={cn("size-4 transition-colors", optimistic ? "fill-danger text-danger" : "text-muted")}
      />
    </button>
  );
}
