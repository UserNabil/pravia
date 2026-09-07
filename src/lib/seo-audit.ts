import "server-only";
import { db } from "./db";
import { getSeoSettings } from "./seo";

export type AuditIssue = {
  level: "error" | "warning" | "info";
  title: string;
  detail: string;
  href?: string;
};

/** Limites conseillees par les moteurs pour l'affichage dans les resultats. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 158;

/** Contenu textuel minimum d une fiche, sous-titre et caracteristiques inclus. */
export const CONTENT_MIN = 350;

/**
 * Passe en revue la configuration et le catalogue pour signaler ce qui
 * empeche ou degrade l'indexation. Les remontees sont classees par gravite.
 */
export async function auditSeo() {
  const settings = await getSeoSettings();

  const [products, categories, pages] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        metaTitle: true,
        metaDescription: true,
        noIndex: true,
        images: { select: { id: true }, take: 1 },
        specs: { select: { label: true, value: true } },
      },
    }),
    db.category.findMany({
      select: { id: true, name: true, slug: true, metaDescription: true, noIndex: true },
    }),
    db.seoPage.findMany(),
  ]);

  const issues: AuditIssue[] = [];

  /* ------------------------------------------------------------- reglages */

  if (settings["seo.indexable"] !== "1") {
    issues.push({
      level: "error",
      title: "Le site est ferme aux moteurs",
      detail:
        "robots.txt interdit toute exploration et le sitemap est vide. A rouvrir avant la mise en ligne.",
    });
  }

  if (/localhost|127\.0\.0\.1/.test(settings["seo.siteUrl"])) {
    issues.push({
      level: "error",
      title: "Adresse du site non renseignee",
      detail:
        "Les URL canoniques et le sitemap pointent encore vers localhost. Renseignez le domaine de production.",
    });
  }

  if (!settings["seo.googleVerification"]) {
    issues.push({
      level: "info",
      title: "Search Console non verifiee",
      detail:
        "Ajoutez le code de verification Google pour suivre l'indexation et soumettre le sitemap.",
    });
  }

  /* -------------------------------------------------------------- produits */

  const longTitles = products.filter(
    (product) => (product.metaTitle ?? "").length > TITLE_MAX
  );
  if (longTitles.length) {
    issues.push({
      level: "warning",
      title: `${longTitles.length} titre(s) SEO trop long(s)`,
      detail: `Au-dela de ${TITLE_MAX} caracteres, Google tronque le titre affiche.`,
      href: "/admin/produits",
    });
  }

  const longDescriptions = products.filter(
    (product) => (product.metaDescription ?? "").length > DESCRIPTION_MAX
  );
  if (longDescriptions.length) {
    issues.push({
      level: "warning",
      title: `${longDescriptions.length} description(s) trop longue(s)`,
      detail: `Au-dela de ${DESCRIPTION_MAX} caracteres, la fin est coupee dans les resultats.`,
      href: "/admin/produits",
    });
  }

  // Le contenu indexable d'une fiche, ce n'est pas que la description : le
  // sous-titre et les caracteristiques comptent tout autant pour les moteurs.
  const thin = products.filter((product) => {
    const specText = product.specs.map((s) => `${s.label} ${s.value}`).join(" ");
    const total = `${product.subtitle ?? ""} ${product.description} ${specText}`.trim().length;
    return total < CONTENT_MIN;
  });

  if (thin.length) {
    issues.push({
      level: "warning",
      title: `${thin.length} fiche(s) au contenu trop mince`,
      detail: `Moins de ${CONTENT_MIN} caracteres en cumulant sous-titre, description et caracteristiques : ces pages se positionnent difficilement.`,
      href: "/admin/produits",
    });
  }

  const noImage = products.filter((product) => product.images.length === 0);
  if (noImage.length) {
    issues.push({
      level: "error",
      title: `${noImage.length} produit(s) sans visuel`,
      detail: "Sans image, la fiche est ecartee des resultats enrichis Google Shopping.",
      href: "/admin/produits",
    });
  }

  const excluded = products.filter((product) => product.noIndex);
  if (excluded.length) {
    issues.push({
      level: "info",
      title: `${excluded.length} produit(s) exclu(s) de l'index`,
      detail: "Ces fiches sont en ligne mais volontairement invisibles pour les moteurs.",
      href: "/admin/produits",
    });
  }

  // Deux fiches au meme titre se font concurrence sur les memes requetes.
  const titleCounts = new Map<string, number>();
  for (const product of products) {
    const key = (product.metaTitle ?? product.title).toLowerCase().trim();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const duplicates = [...titleCounts.values()].filter((count) => count > 1).length;
  if (duplicates) {
    issues.push({
      level: "warning",
      title: `${duplicates} titre(s) en double`,
      detail: "Des fiches partageant le meme titre se cannibalisent dans les resultats.",
      href: "/admin/produits",
    });
  }

  /* ------------------------------------------------------------ categories */

  const categoriesWithoutMeta = categories.filter((category) => !category.metaDescription);
  if (categoriesWithoutMeta.length) {
    issues.push({
      level: "info",
      title: `${categoriesWithoutMeta.length} categorie(s) sans description SEO`,
      detail:
        "Une description propre a la categorie ameliore le positionnement sur les requetes generiques.",
      href: "/admin/categories",
    });
  }

  const order = { error: 0, warning: 1, info: 2 } as const;
  issues.sort((a, b) => order[a.level] - order[b.level]);

  /* ---------------------------------------------------------------- score */

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 7);

  return {
    issues,
    score,
    counts: {
      products: products.length,
      indexedProducts: products.filter((p) => !p.noIndex).length,
      categories: categories.length,
      pages: pages.length,
      customMeta: products.filter((p) => p.metaTitle || p.metaDescription).length,
      errors,
      warnings,
    },
  };
}
