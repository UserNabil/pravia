"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { addToCartAction } from "@/app/actions/cart";
import { useToast } from "./toast";
import { cn } from "@/lib/format";

export function AddToCartButton({
  productId,
  quantity = 1,
  disabled = false,
  className,
  size = "md",
  label,
}: {
  productId: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const t = useTranslations("product");
  const tToast = useTranslations("toast");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  }[size];

  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  function handleClick() {
    startTransition(async () => {
      const result = await addToCartAction(productId, quantity);
      // Le serveur renvoie une cle de message, traduite ici cote client.
      toast(tToast(result.messageKey, result.values), result.ok ? "success" : "error");

      if (result.requiresAuth) {
        router.push("/connexion?redirectTo=/panier");
        return;
      }

      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 1600);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className={cn("btn btn-primary", sizes, className)}
    >
      {pending ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : done ? (
        <Check className={iconSize} />
      ) : (
        <ShoppingCart className={iconSize} />
      )}
      <span>{disabled ? t("unavailable") : done ? t("added") : (label ?? t("add"))}</span>
    </button>
  );
}
