import { formatPrice } from "@/lib/format";

export type ChartPoint = { label: string; value: number; fullLabel: string };

/**
 * Courbe de chiffre d'affaires en SVG pur : pas de librairie, net dans les deux themes.
 */
export function RevenueChart({ points }: { points: ChartPoint[] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 8, bottom: 26, left: 8 };

  const max = Math.max(...points.map((p) => p.value), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const x = (index: number) =>
    padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${padding.left},${padding.top + innerHeight} ${line} ${padding.left + innerWidth},${
    padding.top + innerHeight
  }`;

  // Une etiquette sur quatre pour eviter le chevauchement.
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full min-w-[32rem]"
        role="img"
        aria-label="Chiffre d'affaires des 30 derniers jours"
      >
        <defs>
          <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerHeight * ratio}
            y2={padding.top + innerHeight * ratio}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}

        <polygon points={area} fill="url(#revenue-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, index) => (
          <g key={point.fullLabel}>
            <circle cx={x(index)} cy={y(point.value)} r="9" fill="transparent">
              <title>{`${point.fullLabel} : ${formatPrice(point.value)}`}</title>
            </circle>
            {point.value > 0 && (
              <circle cx={x(index)} cy={y(point.value)} r="2.5" fill="var(--primary)" />
            )}
            {index % labelStep === 0 && (
              <text
                x={x(index)}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted-2)"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Barres horizontales : repartition des ventes par categorie. */
export function BarList({
  rows,
  formatValue = (value: number) => String(value),
}: {
  rows: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formatValue(row.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
