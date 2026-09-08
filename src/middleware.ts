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
  //
  // Le point doit etre echappe deux fois : dans une chaine JavaScript, « \. »
  // vaut « . ». La derniere alternative devenait « .*..* », qui accepte toute
  // adresse d'au moins deux caracteres — le middleware ne s'executait donc
  // plus que sur « / ». Consequences : les adresses sans langue n'etaient plus
  // redirigees et rendaient l'accueil (le segment [locale] avalait « admin »,
  // « produits »...), et l'en-tete de langue n'etant plus pose, toute page
  // omettant setRequestLocale retombait sur l'arabe, langue par defaut.
  matcher: [
    "/((?!api|_next|_vercel|products|media|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|.*\\..*).*)",
  ],
};
