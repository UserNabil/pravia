"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/format";

const OPTIONS = [
  { value: "light", key: "light", Icon: Sun },
  { value: "dark", key: "dark", Icon: Moon },
  { value: "system", key: "system", Icon: Monitor },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);

  // Le theme resolu n'est connu qu'apres l'hydratation.
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, key, Icon }) => {
        const active = mounted && theme === value;
        const label = t(key);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              compact ? "size-6" : "size-7",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-surface-3 hover:text-foreground"
            )}
          >
            <Icon className={compact ? "size-3" : "size-3.5"} strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
