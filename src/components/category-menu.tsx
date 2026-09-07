"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid } from "lucide-react";
import { CategoryIcon } from "./category-icon";

export function CategoryMenu({
  categories,
}: {
  categories: { id: string; slug: string; name: string; icon: string; description: string | null }[];
}) {
  const t = useTranslations("nav");
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors hover:bg-surface-2"
      >
        <LayoutGrid className="size-4" />
        {t("categories")}
      </button>

      {open && (
        <div className="absolute start-0 top-10 z-50 w-[min(46rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/20">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/produits?categorie=${category.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-2"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CategoryIcon name={category.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{category.name}</span>
                  {category.description && (
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted-2">
                      {category.description}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
