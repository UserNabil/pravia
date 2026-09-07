"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
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
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);
  const toast = useToast();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleWishlistAction(productId);
      toast(result.message, result.ok ? "success" : "error");
      if (result.requiresAuth) router.push("/connexion?redirectTo=/favoris");
      else router.refresh();
    });
  }

  if (variant === "button") {
    return (
      <button type="button" onClick={handleClick} disabled={pending} className="btn btn-secondary">
        <Heart className={cn("size-4", optimistic && "fill-danger text-danger")} />
        <span>{optimistic ? "Dans vos favoris" : "Ajouter aux favoris"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={optimistic ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={optimistic}
      className="flex size-8 items-center justify-center rounded-full border border-border bg-surface/85 backdrop-blur transition-colors hover:bg-surface-3"
    >
      <Heart
        className={cn("size-4 transition-colors", optimistic ? "fill-danger text-danger" : "text-muted")}
      />
    </button>
  );
}
