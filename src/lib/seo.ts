import "server-only";
import type { Metadata } from "next";
import { db } from "./db";
import { routing, localePath, LOCALE_TAGS, type Locale } from "@/i18n/routing";

/**
 * Reglages de referencement, editables depuis le back-office.
 * Les valeurs ci-dessous servent de repli tant que rien n'a ete enregistre.
 */
export const SEO_DEFAULTS = {
  "seo.siteUrl": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "seo.siteName": "Pravia",
  "seo.titleTemplate": "%s | Pravia",
  "seo.defaultTitle": "Pravia - La marketplace du materiel technologique",
  "seo.defaultDescription":
    "Smartphones, ordinateurs, audio, gaming et composants. Materiel technologique neuf ou reconditionne, garanti jusqu'a 24 mois, livraison offerte des 150 EUR.",
  "seo.defaultOgImage": "",
  "seo.twitterHandle": "",
  "seo.indexable": "1",
  "seo.googleVerification": "",
  "seo.bingVerification": "",
  "seo.organizationLegalName": "Pravia SAS",
  "seo.organizationAddress": "Paris, France",
} as const;

export type SeoSettings = Record<keyof typeof SEO_DEFAULTS, string>;

/**
 * Lit les reglages SEO en base, completes par les valeurs par defaut.
 *
 * Ces reglages sont de la configuration d'affichage : si la base est
 * injoignable, on retombe sur les valeurs par defaut plutot que de faire
 * echouer le rendu. C'est aussi ce qui permet de compiler le paquet de
 * deploiement sur une machine sans acces a la base de production.
 */
export async function getSeoSettings(): Promise<SeoSettings> {
  const settings = { ...SEO_DEFAULTS } as SeoSettings;

  try {
    const rows = await db.setting.findMany({
      where: { key: { in: Object.keys(SEO_DEFAULTS) } },
    });
    for (const row of rows) {
      if (row.value.trim()) settings[row.key as keyof SeoSettings] = row.value;
    }
  } catch (error) {
    console.warn(
      "[seo] reglages illisibles, valeurs par defaut utilisees :",
      error instanceof Error ? error.message : error
    );
  }

  return settings;
}

/** Base absolue utilisee pour les canoniques, le sitemap et les images sociales. */
export async function getSiteUrl(): Promise<string> {
  const settings = await getSeoSettings();
  return settings["seo.siteUrl"].replace(/\/+$/, "");
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

// Le prefixage par la langue vit dans le routage : il n'a rien de specifique
// au referencement et sert aussi aux redirections.
export { localePath };

/**
 * Declare aux moteurs les versions equivalentes d'une meme page.
 *
 * x-default designe la version proposee a un visiteur dont la langue n'est
 * couverte par aucune traduction.
 */
export function localeAlternates(siteUrl: string, path: string, current: Locale) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[LOCALE_TAGS[locale]] = absoluteUrl(siteUrl, localePath(locale, path));
  }
  languages["x-default"] = absoluteUrl(siteUrl, localePath(routing.defaultLocale, path));

  return {
    canonical: absoluteUrl(siteUrl, localePath(current, path)),
    languages,
  };
}

/** Coupe proprement une description a la limite conseillee, sans casser un mot. */
export function truncateDescription(input: string, max = 158): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trimEnd()}...`;
}

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
  locale: Locale;
  type?: "website" | "article";
  /** Le titre est utilise tel quel, sans le gabarit du layout. */
  absoluteTitle?: boolean;
  /**
   * Laisse Next injecter l'image du segment (opengraph-image.tsx colocalise).
   * A activer sur les fiches produit, qui ont leur propre visuelle.
   */
  useSegmentImage?: boolean;
};

/**
 * Fabrique un objet Metadata complet : canonique, OpenGraph et carte Twitter.
 * Toutes les pages passent par ici pour rester coherentes.
 */
export async function buildMetadata(input: BuildMetadataInput): Promise<Metadata> {
  const settings = await getSeoSettings();
  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");
  const indexable = settings["seo.indexable"] === "1" && !input.noIndex;

  const alternates = localeAlternates(siteUrl, input.path, input.locale);
  const canonical = alternates.canonical;
  const description = truncateDescription(input.description);

  // L'image du segment n'est injectee que si la page n'en declare pas ; le
  // fichier racine n'etant pas herite par les groupes de routes, on la pose
  // explicitement partout sauf la ou un visuel dedie existe.
  const explicitImage = input.useSegmentImage
    ? input.image || null
    : input.image || settings["seo.defaultOgImage"] || localePath(input.locale, "/opengraph-image");
  const imageUrl = explicitImage ? absoluteUrl(siteUrl, explicitImage) : null;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates,
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false },
    openGraph: {
      title: input.title,
      description,
      url: canonical,
      siteName: settings["seo.siteName"],
      locale: LOCALE_TAGS[input.locale].replace("-", "_"),
      alternateLocale: routing.locales
        .filter((l) => l !== input.locale)
        .map((l) => LOCALE_TAGS[l].replace("-", "_")),
      type: input.type ?? "website",
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: input.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
      ...(settings["seo.twitterHandle"]
        ? { site: settings["seo.twitterHandle"], creator: settings["seo.twitterHandle"] }
        : {}),
    },
  };
}

/**
 * Metadonnees d'une page editoriale, surchargees par le back-office si presentes.
 *
 * Les surcharges sont enregistrees par langue : une page a donc un titre propre
 * a chaque version, et retombe sur le libelle traduit a defaut.
 */
export async function buildPageMetadata(
  path: string,
  locale: Locale,
  fallback: { title: string; description: string }
): Promise<Metadata> {
  const page = await db.seoPage.findUnique({
    where: { path },
    include: { translations: { where: { locale } } },
  });

  const translation = page?.translations[0];

  return buildMetadata({
    title: translation?.metaTitle?.trim() || page?.metaTitle?.trim() || fallback.title,
    description:
      translation?.metaDescription?.trim() || page?.metaDescription?.trim() || fallback.description,
    path,
    locale,
    image: page?.ogImage,
    noIndex: page?.noIndex,
  });
}

/* ------------------------------------------------------------------ JSON-LD */

/** Serialise un bloc de donnees structurees en echappant la fermeture de script. */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function organizationSchema() {
  const settings = await getSeoSettings();
  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: settings["seo.siteName"],
    legalName: settings["seo.organizationLegalName"],
    url: siteUrl,
    logo: absoluteUrl(siteUrl, "/icon.png"),
    description: settings["seo.defaultDescription"],
    ...(settings["seo.organizationAddress"]
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: settings["seo.organizationAddress"],
          },
        }
      : {}),
  };
}

/** Declare le moteur de recherche interne aux robots, dans la langue courante. */
export async function websiteSchema(locale: Locale) {
  const settings = await getSeoSettings();
  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");
  const base = absoluteUrl(siteUrl, localePath(locale, "/"));

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}#website`,
    url: base,
    name: settings["seo.siteName"],
    description: settings["seo.defaultDescription"],
    inLanguage: LOCALE_TAGS[locale],
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(siteUrl, localePath(locale, "/produits"))}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
  siteUrl: string,
  locale: Locale,
  trail: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(siteUrl, localePath(locale, step.path)),
    })),
  };
}

type ProductSchemaInput = {
  siteUrl: string;
  locale: Locale;
  product: {
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    sku: string;
    price: number;
    stock: number;
    condition: string;
    warrantyMonths: number;
    brand: { name: string };
    category: { name: string };
    images: { url: string }[];
  };
  rating: number;
  reviewCount: number;
  reviews: {
    rating: number;
    title: string;
    body: string;
    createdAt: Date;
    user: { name: string };
  }[];
};

const SCHEMA_CONDITIONS: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  REFURBISHED: "https://schema.org/RefurbishedCondition",
  SECOND_HAND: "https://schema.org/UsedCondition",
};

export function productSchema({
  siteUrl,
  locale,
  product,
  rating,
  reviewCount,
  reviews,
}: ProductSchemaInput) {
  const url = absoluteUrl(siteUrl, localePath(locale, `/produits/${product.slug}`));

  // La garantie court a partir de l'achat : un an de validite d'offre suffit.
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    description: truncateDescription(product.subtitle ?? product.description, 300),
    sku: product.sku,
    mpn: product.sku,
    category: product.category.name,
    brand: { "@type": "Brand", name: product.brand.name },
    image: product.images.map((image) => absoluteUrl(siteUrl, image.url)),
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: (product.price / 100).toFixed(2),
      priceValidUntil: priceValidUntil.toISOString().slice(0, 10),
      itemCondition: SCHEMA_CONDITIONS[product.condition] ?? SCHEMA_CONDITIONS.NEW,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${siteUrl}/#organization` },
      warranty: {
        "@type": "WarrantyPromise",
        durationOfWarranty: {
          "@type": "QuantitativeValue",
          value: product.warrantyMonths,
          unitCode: "MON",
        },
      },
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.toFixed(1),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 5).map((review) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: review.user.name },
            name: review.title,
            reviewBody: review.body,
            datePublished: review.createdAt.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };
}

export function itemListSchema(
  siteUrl: string,
  locale: Locale,
  products: { slug: string; title: string; price: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(siteUrl, localePath(locale, `/produits/${product.slug}`)),
      name: product.title,
    })),
  };
}

export function faqSchema(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
