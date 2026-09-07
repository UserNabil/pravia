"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";
import type { AdminState } from "@/app/actions/admin";

/**
 * Retour d'un formulaire du back-office.
 *
 * Les actions renvoient une cle et ses variables ; la traduction se fait ici,
 * une seule fois, plutot que dans chaque formulaire.
 */
export function FormFeedback({ state, size = "sm" }: { state: AdminState; size?: "xs" | "sm" }) {
  const t = useTranslations("admin.feedback");

  const padding = size === "xs" ? "p-2.5 text-xs" : "p-3 text-sm";
  const icon = size === "xs" ? "size-3.5" : "size-4";

  if (state.errorKey) {
    return (
      <p className={cn("rounded-lg bg-danger/10 text-danger", padding)}>
        {t(state.errorKey, state.values)}
      </p>
    );
  }

  if (state.successKey) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 rounded-lg bg-success/10 text-success",
          padding
        )}
      >
        <Check className={cn("shrink-0", icon)} />
        {t(state.successKey, state.values)}
      </p>
    );
  }

  return null;
}
