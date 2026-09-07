"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Clock, Loader2, Search, Tag, X } from "lucide-react";
import { formatPrice, cn } from "@/lib/format";

type Suggestions = {
  products: {
    slug: string;
    title: string;
    price: number;
    brand: string;
    category: string;
    image: string | null;
  }[];
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
};

const EMPTY: Suggestions = { products: [], categories: [], brands: [] };
const HISTORY_KEY = "pravia:recherches";
const HISTORY_MAX = 5;

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function pushHistory(term: string) {
  try {
    const next = [term, ...readHistory().filter((t) => t !== term)].slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Navigation privee ou stockage refuse : l'historique est un simple confort.
  }
}

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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [term, setTerm] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setHistory(readHistory()), []);

  // Fermeture au clic exterieur et a l'echappement.
  useEffect(() => {
    if (!panelOpen && !categoryOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
        setCategoryOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen, categoryOpen]);

  // Interrogation differee : on laisse la frappe se stabiliser avant d'appeler.
  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions(EMPTY);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recherche?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (response.ok) setSuggestions((await response.json()) as Suggestions);
      } catch {
        // Requete annulee par une frappe suivante : rien a signaler.
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const go = useCallback(
    (target: string, remember?: string) => {
      if (remember) {
        pushHistory(remember);
        setHistory(readHistory());
      }
      setPanelOpen(false);
      inputRef.current?.blur();
      router.push(target);
    },
    [router]
  );

  const submit = useCallback(
    (raw?: string) => {
      const value = (raw ?? term).trim();
      const query = new URLSearchParams();
      if (value) query.set("q", value);
      if (category) query.set("categorie", category);
      go(`/produits${query.toString() ? `?${query}` : ""}`, value || undefined);
    },
    [term, category, go]
  );

  // Liste a plat des entrees navigables au clavier.
  const flat = [
    ...suggestions.products.map((p) => ({ label: p.title, href: `/produits/${p.slug}` })),
    ...suggestions.categories.map((c) => ({
      label: c.name,
      href: `/produits?categorie=${c.slug}`,
    })),
    ...suggestions.brands.map((b) => ({ label: b.name, href: `/produits?marque=${b.slug}` })),
  ];

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!panelOpen || !flat.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => (index <= 0 ? flat.length - 1 : index - 1));
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      go(flat[highlighted].href, term.trim() || undefined);
    }
  }

  const activeCategory = categories.find((c) => c.slug === category);
  const showHistory = term.trim().length < 2 && history.length > 0;
  const hasSuggestions = flat.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        role="search"
        className="flex h-10 w-full items-center rounded-full border border-border bg-surface-2 pr-1.5 transition-colors focus-within:border-primary"
      >
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setCategoryOpen((v) => !v)}
            aria-expanded={categoryOpen}
            aria-haspopup="listbox"
            className="ml-1 flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <span className="max-w-28 truncate">{activeCategory?.name ?? "Produits"}</span>
            <ChevronDown className="size-3.5" />
          </button>

          {categoryOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-10 z-50 max-h-80 w-60 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20"
            >
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setCategoryOpen(false);
                  }}
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
                    onClick={() => {
                      setCategory(item.slug);
                      setCategoryOpen(false);
                    }}
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
          type="text"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setPanelOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setPanelOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un produit..."
          aria-label="Rechercher un produit"
          aria-autocomplete="list"
          aria-expanded={panelOpen && (hasSuggestions || showHistory)}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
        />

        {loading && <Loader2 className="mr-1 size-3.5 shrink-0 animate-spin text-muted-2" />}

        {term && !loading && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setSuggestions(EMPTY);
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}

        <button type="submit" className="btn btn-primary h-8 rounded-full px-4 text-xs">
          Rechercher
        </button>
      </form>

      {panelOpen && (showHistory || hasSuggestions) && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/20">
          {showHistory && (
            <div className="p-1.5">
              <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-2">
                Recherches recentes
              </p>
              {history.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setTerm(entry);
                    submit(entry);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                >
                  <Clock className="size-3.5 shrink-0 text-muted-2" />
                  {entry}
                </button>
              ))}
            </div>
          )}

          {suggestions.products.length > 0 && (
            <div className="p-1.5">
              <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-2">
                Produits
              </p>
              {suggestions.products.map((product, index) => (
                <button
                  key={product.slug}
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => go(`/produits/${product.slug}`, term.trim())}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    highlighted === index ? "bg-surface-2" : "hover:bg-surface-2"
                  )}
                >
                  <span className="size-9 shrink-0 rounded-lg bg-surface-2 p-1">
                    {product.image && (
                      <Image
                        src={product.image}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-contain"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.title}</span>
                    <span className="block truncate text-xs text-muted-2">
                      {product.brand} — {product.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatPrice(product.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {(suggestions.categories.length > 0 || suggestions.brands.length > 0) && (
            <div className="border-t border-border p-1.5">
              {suggestions.categories.map((item, index) => {
                const flatIndex = suggestions.products.length + index;
                return (
                  <button
                    key={`c-${item.slug}`}
                    type="button"
                    onMouseEnter={() => setHighlighted(flatIndex)}
                    onClick={() => go(`/produits?categorie=${item.slug}`, term.trim())}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      highlighted === flatIndex ? "bg-surface-2" : "hover:bg-surface-2"
                    )}
                  >
                    <Tag className="size-3.5 shrink-0 text-muted-2" />
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-2">Categorie</span>
                  </button>
                );
              })}

              {suggestions.brands.map((item, index) => {
                const flatIndex =
                  suggestions.products.length + suggestions.categories.length + index;
                return (
                  <button
                    key={`b-${item.slug}`}
                    type="button"
                    onMouseEnter={() => setHighlighted(flatIndex)}
                    onClick={() => go(`/produits?marque=${item.slug}`, term.trim())}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      highlighted === flatIndex ? "bg-surface-2" : "hover:bg-surface-2"
                    )}
                  >
                    <Tag className="size-3.5 shrink-0 text-muted-2" />
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-2">Marque</span>
                  </button>
                );
              })}
            </div>
          )}

          {term.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => submit()}
              className="w-full border-t border-border px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-2"
            >
              Voir tous les resultats pour &laquo; {term.trim()} &raquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
