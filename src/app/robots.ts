import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Chemins sans valeur pour un moteur : espace client, tunnel d'achat, back-office. */
const PRIVATE_PATHS = [
  "/admin",
  "/admin/",
  "/compte",
  "/compte/",
  "/panier",
  "/commande",
  "/favoris",
  "/connexion",
  "/inscription",
  "/api/",
];

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
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
