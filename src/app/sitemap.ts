import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSeoSettings, absoluteUrl } from "@/lib/seo";

// Genere a la demande : le contenu depend de la base, qui n'est pas
// joignable au moment de la compilation du paquet de deploiement.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSeoSettings();

  // Site declare non indexable : on ne publie aucune URL.
  if (settings["seo.indexable"] !== "1") return [];

  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");

  const [pages, products, categories, brands] = await Promise.all([
    db.seoPage.findMany({ where: { inSitemap: true, noIndex: false } }),
    db.product.findMany({
      where: { active: true, noIndex: false },
      select: { slug: true, updatedAt: true, featured: true },
    }),
    db.category.findMany({
      where: { noIndex: false },
      select: { slug: true, products: { where: { active: true }, select: { id: true }, take: 1 } },
    }),
    db.brand.findMany({
      select: { slug: true, products: { where: { active: true }, select: { id: true }, take: 1 } },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: absoluteUrl(siteUrl, page.path),
    lastModified: page.updatedAt,
    changeFrequency: page.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: page.priority,
  }));

  for (const product of products) {
    entries.push({
      url: absoluteUrl(siteUrl, `/produits/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: product.featured ? 0.9 : 0.7,
    });
  }

  // Les pages de facettes ne sont listees que si elles ont du contenu.
  for (const category of categories) {
    if (!category.products.length) continue;
    entries.push({
      url: absoluteUrl(siteUrl, `/produits?categorie=${category.slug}`),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const brand of brands) {
    if (!brand.products.length) continue;
    entries.push({
      url: absoluteUrl(siteUrl, `/produits?marque=${brand.slug}`),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}
