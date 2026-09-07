export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payee",
  SHIPPED: "Expediee",
  DELIVERED: "Livree",
  CANCELLED: "Annulee",
  REFUNDED: "Remboursee",
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-amber-500/25",
  PAID: "bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-sky-500/25",
  SHIPPED: "bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-violet-500/25",
  DELIVERED: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
  CANCELLED: "bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-rose-500/25",
  REFUNDED: "bg-slate-500/12 text-slate-600 dark:text-slate-400 ring-slate-500/25",
};

export const CONDITIONS = ["NEW", "REFURBISHED", "SECOND_HAND"] as const;

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "Neuf",
  REFURBISHED: "Reconditionne",
  SECOND_HAND: "Seconde main",
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: "En moderation",
  PUBLISHED: "Publie",
  REJECTED: "Rejete",
};

export const SORT_OPTIONS = [
  { value: "best-sellers", label: "Meilleures ventes" },
  { value: "newest", label: "Nouveautes" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix decroissant" },
  { value: "rating", label: "Mieux notes" },
] as const;

/** Frais de port : offerts au-dessus du seuil. */
export const FREE_SHIPPING_THRESHOLD = 15000; // 150,00 EUR
export const SHIPPING_FLAT_RATE = 990; // 9,90 EUR
export const VAT_RATE = 0.2;
