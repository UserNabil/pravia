"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X, Zap } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { formatPrice, cn } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/constants";

type Facets = {
  categories: { id: string; slug: string; name: string; icon: string; _count: { products: number } }[];
  brands: { id: string; slug: string; name: string; _count: { products: number } }[];
  conditions: { condition: string; _count: { condition: number } }[];
  minPrice: number;
  maxPrice: number;
};

export function CatalogFilters({ facets }: { facets: Facets }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary lg:hidden"
        aria-label="Ouvrir les filtres"
      >
        <SlidersHorizontal className="size-4" />
        Filtres
      </button>

      {/* Panneau lateral permanent sur grand ecran. */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="surface-card sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto p-4">
          <FilterPanel facets={facets} />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer les filtres"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,90vw)] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Filtres</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Le tiroir porte deja son titre : on ne le repete pas dans le panneau. */}
              <FilterPanel facets={facets} onApply={() => setOpen(false)} hideHeading />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterPanel({
  facets,
  onApply,
  hideHeading = false,
}: {
  facets: Facets;
  onApply?: () => void;
  hideHeading?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectedBrands = params.getAll("marque");
  const selectedConditions = params.getAll("condition");
  const selectedCategory = params.get("categorie") ?? "";
  const maxParam = Number(params.get("prix_max") ?? facets.maxPrice);
  const [priceMax, setPriceMax] = useState(maxParam);

  useEffect(() => setPriceMax(maxParam), [maxParam]);

  const commit = useCallback(
    (next: URLSearchParams) => {
      next.delete("page");
      startTransition(() => {
        router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
        onApply?.();
      });
    },
    [pathname, router, onApply]
  );

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key);
      next.delete(key);
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updated.forEach((v) => next.append(key, v));
      commit(next);
    },
    [params, commit]
  );

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      commit(next);
    },
    [params, commit]
  );

  const toggleFlag = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      if (next.get(key) === "1") next.delete(key);
      else next.set(key, "1");
      commit(next);
    },
    [params, commit]
  );

  const activeCount =
    selectedBrands.length +
    selectedConditions.length +
    (selectedCategory ? 1 : 0) +
    (params.get("assurance") === "1" ? 1 : 0) +
    (params.get("dispo") === "1" ? 1 : 0) +
    (params.get("prix_max") ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className={cn("flex items-center", hideHeading ? "justify-end" : "justify-between")}>
        {!hideHeading && (
          <h2 className="flex items-center gap-2 text-sm font-bold">
            Filtrer
            {pending && <Loader2 className="size-3.5 animate-spin text-muted-2" />}
          </h2>
        )}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams();
              const q = params.get("q");
              const tri = params.get("tri");
              if (q) next.set("q", q);
              if (tri) next.set("tri", tri);
              commit(next);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Reinitialiser ({activeCount})
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <CheckRow
          checked={params.get("assurance") === "1"}
          onChange={() => toggleFlag("assurance")}
          label={
            <span className="flex items-center gap-1.5">
              Trade Assurance
              <Zap className="size-3.5 text-warning" />
            </span>
          }
        />
        <CheckRow
          checked={params.get("dispo") === "1"}
          onChange={() => toggleFlag("dispo")}
          label="Expedition immediate"
        />
      </div>

      <Group title="Types de produits">
        <div className="grid grid-cols-5 gap-1.5">
          {facets.categories.map((category) => {
            const active = selectedCategory === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                title={`${category.name} (${category._count.products})`}
                aria-label={category.name}
                aria-pressed={active}
                onClick={() => setSingle("categorie", active ? null : category.slug)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
                )}
              >
                <CategoryIcon name={category.icon} className="size-4" />
              </button>
            );
          })}
        </div>
        {selectedCategory && (
          <p className="mt-2 text-xs text-muted-2">
            {facets.categories.find((c) => c.slug === selectedCategory)?.name}
          </p>
        )}
      </Group>

      <Group title="Marque">
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {facets.brands.map((brand) => (
            <CheckRow
              key={brand.id}
              checked={selectedBrands.includes(brand.slug)}
              onChange={() => toggleMulti("marque", brand.slug)}
              label={brand.name}
              hint={String(brand._count.products)}
            />
          ))}
        </div>
      </Group>

      <Group title="Budget maximum">
        <input
          type="range"
          min={facets.minPrice}
          max={facets.maxPrice}
          step={1000}
          value={priceMax}
          onChange={(event) => setPriceMax(Number(event.target.value))}
          onPointerUp={() =>
            setSingle("prix_max", priceMax >= facets.maxPrice ? null : String(priceMax))
          }
          onKeyUp={() => setSingle("prix_max", priceMax >= facets.maxPrice ? null : String(priceMax))}
          aria-label="Budget maximum"
          className="w-full accent-[var(--primary)]"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-2">
          <span>{formatPrice(facets.minPrice)}</span>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-foreground">
            {formatPrice(priceMax)}
          </span>
          <span>{formatPrice(facets.maxPrice)}</span>
        </div>
      </Group>

      <Group title="Etat">
        <div className="space-y-2">
          {facets.conditions.map((row) => (
            <CheckRow
              key={row.condition}
              checked={selectedConditions.includes(row.condition)}
              onChange={() => toggleMulti("condition", row.condition)}
              label={CONDITION_LABELS[row.condition] ?? row.condition}
              hint={String(row._count.condition)}
            />
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-5">
      <p className="mb-3 text-sm font-bold">{title}</p>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 cursor-pointer rounded border-border accent-[var(--primary)]"
      />
      <span className={cn("flex-1", checked ? "font-medium text-foreground" : "text-muted")}>
        {label}
      </span>
      {hint && <span className="text-xs text-muted-2">{hint}</span>}
    </label>
  );
}
