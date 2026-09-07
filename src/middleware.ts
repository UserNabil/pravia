import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Redirige la racine vers la langue du visiteur et prefixe les adresses
 * depourvues de langue.
 */
export default createMiddleware(routing);

export const config = {
  // Les routes techniques restent hors du prefixe de langue : elles ne
  // renvoient pas de contenu traduit.
  matcher: [
    "/((?!api|_next|_vercel|products|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|.*\..*).*)",
  ],
};
