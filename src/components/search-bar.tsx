"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/format";

export function SearchBar({
  categories,
  className,
}: {
  categories: { slug: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("categorie") ?? "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams();
    const term = inputRef.current?.value.trim();
    if (term) query.set("q", term);
    if (category) query.set("categorie", category);
    router.push(`/produits${query.toString() ? `?${query}` : ""}`);
  }

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "flex h-10 items-center rounded-full border border-border bg-surface-2 pr-1.5 transition-colors focus-within:border-primary",
        className
      )}
    >
      <div className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground ml-1"
        >
          <span className="max-w-28 truncate">{activeCategory?.name ?? "Produits"}</span>
          <ChevronDown className="size-3.5" />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute left-0 top-10 z-50 max-h-80 w-60 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20"
          >
            <li>
              <button
                type="button"
                onMouseDown={() => setCategory("")}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2",
                  !category && "text-primary"
                )}
              >
                Toutes les categories
              </button>
            </li>
            {categories.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  onMouseDown={() => setCategory(item.slug)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2",
                    category === item.slug && "text-primary"
                  )}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Search className="mx-2.5 size-4 shrink-0 text-muted-2" />
      <input
        ref={inputRef}
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Rechercher un produit..."
        aria-label="Rechercher un produit"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
      />
      <button type="submit" className="btn btn-primary h-8 rounded-full px-4 text-xs">
        Rechercher
      </button>
    </form>
  );
}
