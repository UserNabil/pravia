import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSeoSettings, absoluteUrl, localePath } from "@/lib/seo";
import { routing, LOCALE_TAGS, type Locale } from "@/i18n/routing";

// Genere a la demande : le contenu depend de la base, qui n'est pas
// joignable au moment de la compilation du paquet de deploiement.
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/**
 * Construit une entree par langue et declare leurs equivalences.
 *
 * Chaque URL porte l'ensemble des `alternates.languages` : un moteur qui
 * decouvre la version arabe sait ainsi qu'il existe une version francaise et
 * anglaise du meme contenu, et n'y voit pas du contenu duplique.
 */
function localized(
  siteUrl: string,
  path: string,
  rest: Omit<Entry, "url" | "alternates">
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[LOCALE_TAGS[locale]] = absoluteUrl(siteUrl, localePath(locale, path));
  }
  languages["x-default"] = absoluteUrl(siteUrl, localePath(routing.defaultLocale, path));

  return routing.locales.map((locale: Locale) => ({
    url: absoluteUrl(siteUrl, localePath(locale, path)),
    alternates: { languages },
    ...rest,
  }));
}

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

  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    entries.push(
      ...localized(siteUrl, page.path, {
        lastModified: page.updatedAt,
        changeFrequency: page.changeFrequency as Entry["changeFrequency"],
        priority: page.priority,
      })
    );
  }

  for (const product of products) {
    entries.push(
      ...localized(siteUrl, `/produits/${product.slug}`, {
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: product.featured ? 0.9 : 0.7,
      })
    );
  }

  // Les pages de facettes ne sont listees que si elles ont du contenu.
  for (const category of categories) {
    if (!category.products.length) continue;
    entries.push(
      ...localized(siteUrl, `/produits?categorie=${category.slug}`, {
        changeFrequency: "daily",
        priority: 0.8,
      })
    );
  }

  for (const brand of brands) {
    if (!brand.products.length) continue;
    entries.push(
      ...localized(siteUrl, `/produits?marque=${brand.slug}`, {
        changeFrequency: "weekly",
        priority: 0.5,
      })
    );
  }

  return entries;
}
