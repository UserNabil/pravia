/**
 * Normalisation partagee par l'indexation et l'interrogation.
 * Ce module est volontairement sans dependance serveur : le seed l'utilise aussi.
 */

/** Minuscules, sans accents, ponctuation reduite a des espaces. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Decoupe une requete en termes utiles, en ecartant les mots vides. */
const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "a", "au", "aux",
  "en", "pour", "avec", "sur", "par", "dans", "the", "and", "for", "with",
]);

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Construit le texte indexe d'un produit. L'ordre compte : le titre arrive en
 * tete, ce qui permet au classement de reperer une correspondance forte.
 */
export function buildSearchText(parts: {
  title: string;
  subtitle?: string | null;
  brand: string;
  category: string;
  sku: string;
  storage?: string | null;
  color?: string | null;
  carrier?: string | null;
  description?: string | null;
  specs?: { label: string; value: string }[];
}): string {
  const segments = [
    parts.title,
    parts.subtitle ?? "",
    parts.brand,
    parts.category,
    parts.sku,
    parts.storage ?? "",
    parts.color ?? "",
    parts.carrier ?? "",
    parts.description ?? "",
    ...(parts.specs ?? []).map((spec) => `${spec.label} ${spec.value}`),
  ];

  return normalize(segments.join(" "));
}

/**
 * Score de pertinence d'un produit pour une requete donnee.
 * Une correspondance dans le titre pese bien plus qu'une occurrence perdue au
 * fond de la description ; les ventes departagent les ex aequo.
 */
export function scoreProduct(
  product: {
    title: string;
    subtitle?: string | null;
    brand: { name: string };
    category: { name: string };
    sku: string;
    searchText: string;
    soldCount: number;
  },
  tokens: string[]
): number {
  if (!tokens.length) return 0;

  const title = normalize(product.title);
  const subtitle = normalize(product.subtitle ?? "");
  const brand = normalize(product.brand.name);
  const category = normalize(product.category.name);
  const sku = normalize(product.sku);
  const full = product.searchText;

  let score = 0;

  for (const token of tokens) {
    if (title === token) score += 120;
    else if (title.startsWith(token)) score += 70;
    else if (title.includes(token)) score += 50;

    if (sku.includes(token)) score += 60;
    if (brand.includes(token)) score += 30;
    if (category.includes(token)) score += 20;
    if (subtitle.includes(token)) score += 12;
    else if (full.includes(token)) score += 5;
  }

  // Une requete dont tous les termes tombent dans le titre passe devant.
  if (tokens.every((token) => title.includes(token))) score += 60;

  // Depart des ex aequo par la popularite, sans jamais dominer la pertinence.
  score += Math.min(product.soldCount / 100, 15);

  return score;
}
