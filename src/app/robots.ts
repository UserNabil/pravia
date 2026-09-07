import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Chemins sans valeur pour un moteur : espace client, tunnel d'achat, back-office. */
const PRIVATE_PATHS = [
  "/admin",
  "/compte",
  "/panier",
  "/commande",
  "/favoris",
  "/connexion",
  "/inscription",
];

/**
 * Toutes les pages vivent sous un prefixe de langue : la regle doit donc
 * couvrir /fr/admin comme /ar/admin, sans quoi seule la forme sans prefixe
 * serait bloquee — et elle n'existe pas.
 */
function disallowedPaths(): string[] {
  const paths = ["/api/"];
  for (const locale of routing.locales) {
    for (const path of PRIVATE_PATHS) {
      paths.push(`/${locale}${path}`, `/${locale}${path}/`);
    }
  }
  return paths;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings();
  const siteUrl = settings["seo.siteUrl"].replace(/\/+$/, "");

  if (settings["seo.indexable"] !== "1") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths(),
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
