import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

/** Fenetre glissante de 5 pages autour de la page courante. */
function pageWindow(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function Pagination({
  page,
  pageCount,
  baseParams,
  basePath = "/produits",
}: {
  page: number;
  pageCount: number;
  baseParams: URLSearchParams;
  basePath?: string;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(baseParams.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    return `${basePath}${next.toString() ? `?${next}` : ""}`;
  };

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn btn-secondary size-9 p-0" aria-label="Page precedente">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="btn btn-secondary size-9 cursor-not-allowed p-0 opacity-45">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(page, pageCount).map((target) => (
        <Link
          key={target}
          href={hrefFor(target)}
          aria-current={target === page ? "page" : undefined}
          className={cn("btn size-9 p-0 tabular-nums", target === page ? "btn-primary" : "btn-secondary")}
        >
          {target}
        </Link>
      ))}

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="btn btn-secondary size-9 p-0" aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="btn btn-secondary size-9 cursor-not-allowed p-0 opacity-45">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
