export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];


export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-amber-500/25",
  PAID: "bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-sky-500/25",
  SHIPPED: "bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-violet-500/25",
  DELIVERED: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
  CANCELLED: "bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-rose-500/25",
  REFUNDED: "bg-slate-500/12 text-slate-600 dark:text-slate-400 ring-slate-500/25",
};

export const CONDITIONS = ["NEW", "REFURBISHED", "SECOND_HAND"] as const;

/**
 * Unites de garantie. Un accessoire d'entree de gamme peut n'etre garanti que
 * quelques jours, un chargeur de marque plusieurs annees : la duree se saisit
 * donc en valeur plus unite, et non en mois.
 */
export const WARRANTY_UNITS = ["DAY", "MONTH", "YEAR"] as const;
export type WarrantyUnit = (typeof WARRANTY_UNITS)[number];

export const WARRANTY_UNIT_LABELS: Record<WarrantyUnit, string> = {
  DAY: "jour(s)",
  MONTH: "mois",
  YEAR: "an(s)",
};



export const SORT_OPTIONS = [
  { value: "best-sellers", key: "bestSellers" },
  { value: "newest", key: "newest" },
  { value: "price-asc", key: "priceAsc" },
  { value: "price-desc", key: "priceDesc" },
  { value: "rating", key: "rating" },
] as const;

/**
 * Monnaie : dinar algerien. Les montants restent stockes en centimes, comme
 * partout ailleurs dans le schema — un entier evite les erreurs d'arrondi des
 * flottants. Le dinar ne s'affiche pas avec ses centimes dans l'usage courant :
 * formatPrice les masque.
 */
export const CURRENCY = "DZD";

/**
 * Frais de port : offerts au-dessus du seuil. En dessous, le tarif vient de la
 * wilaya de livraison, ou de la commune quand elle en definit un (voir
 * resolveShippingFee).
 */
export const FREE_SHIPPING_THRESHOLD = 30000000; // 300 000,00 DA

/** Tarif de secours, si la wilaya choisie n'a pas encore de tarif renseigne. */
export const SHIPPING_FALLBACK_RATE = 60000; // 600,00 DA

/** TVA algerienne au taux normal. */
export const VAT_RATE = 0.19;

/**
 * Libelles du back-office, encore monolingue.
 * La boutique, elle, passe par les catalogues de traduction.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payee",
  SHIPPED: "Expediee",
  DELIVERED: "Livree",
  CANCELLED: "Annulee",
  REFUNDED: "Remboursee",
};

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
