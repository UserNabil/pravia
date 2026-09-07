"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = params.get("tri") ?? "best-sellers";

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set("tri", event.target.value);
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tri" className="whitespace-nowrap text-sm text-muted">
        Trier par
      </label>
      <div className="relative">
        <select
          id="tri"
          value={current}
          onChange={handleChange}
          className="appearance-none rounded-lg border border-border bg-surface-2 py-1.5 pl-3 pr-8 text-sm font-medium outline-none transition-colors hover:border-border-strong focus:border-primary"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-2">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
        </span>
      </div>
    </div>
  );
}
