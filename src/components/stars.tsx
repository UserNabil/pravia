import { Star } from "lucide-react";
import { cn } from "@/lib/format";

export function Stars({
  rating,
  size = "sm",
  showValue = false,
  count,
}: {
  rating: number;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  count?: number;
}) {
  const dimensions = { xs: "size-3", sm: "size-3.5", md: "size-4" }[size];

  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Note : ${rating} sur 5${count !== undefined ? `, ${count} avis` : ""}`}
    >
      <span className="flex items-center gap-px" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((index) => {
          const filled = rating >= index - 0.25;
          const half = !filled && rating >= index - 0.75;
          return (
            <Star
              key={index}
              className={cn(
                dimensions,
                filled || half ? "fill-star text-star" : "fill-transparent text-border-strong"
              )}
              strokeWidth={1.8}
              style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
            />
          );
        })}
      </span>
      {showValue && (
        <span className="text-xs font-semibold tabular-nums">
          {rating > 0 ? rating.toFixed(1) : "-"}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs text-muted-2">({count})</span>
      )}
    </span>
  );
}

/** Variante compacte utilisee sur les vignettes du catalogue. */
export function RatingBadge({ rating }: { rating: number }) {
  if (rating <= 0) {
    return <span className="text-xs text-muted-2">Nouveau</span>;
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
      <Star className="size-3.5 fill-star text-star" strokeWidth={1.8} />
      <span className="tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}
