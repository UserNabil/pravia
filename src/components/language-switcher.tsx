"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/format";

/**
 * Selecteur de langue.
 *
 * Le changement conserve la page courante et ses parametres : passer en arabe
 * depuis une fiche produit filtree ramene sur la meme fiche, pas sur l'accueil.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const current = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(locale: Locale) {
    setOpen(false);
    if (locale === current) return;

    // usePathname de next-intl retourne le chemin sans prefixe de langue, avec
    // les segments dynamiques deja resolus : il suffit de le rejouer dans la
    // langue choisie, en conservant les parametres de recherche.
    const query = searchParams.toString();
    const target = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(target, { locale });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("language")}
        disabled={pending}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border bg-surface-2 font-semibold transition-colors hover:bg-surface-3",
          compact ? "h-7 px-2 text-[0.6875rem]" : "h-8 px-2.5 text-xs"
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Globe className={compact ? "size-3" : "size-3.5"} />
        )}
        <span>{LOCALE_LABELS[current].short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language")}
          className="absolute end-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20"
        >
          {routing.locales.map((locale) => (
            <li key={locale}>
              <button
                type="button"
                role="option"
                aria-selected={locale === current}
                onClick={() => select(locale)}
                // Chaque libelle s'affiche dans sa propre langue et son propre
                // sens de lecture, pour rester reconnaissable.
                lang={locale}
                dir={locale === "ar" ? "rtl" : "ltr"}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-2",
                  locale === current && "font-medium text-primary"
                )}
              >
                <span>{LOCALE_LABELS[locale].name}</span>
                {locale === current && <Check className="size-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
