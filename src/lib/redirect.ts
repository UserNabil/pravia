import "server-only";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { localePath, toLocale, routing, type Locale } from "@/i18n/routing";

/**
 * Redirections internes qui conservent la langue.
 *
 * `redirect()` de Next travaille sur des chemins bruts : appele avec
 * "/compte", il envoie l'internaute sur une adresse qui n'existe pas, toutes
 * les pages vivant sous /<langue>. Ces helpers ajoutent le prefixe manquant.
 */

/**
 * Redirection depuis une action serveur ou un composant serveur.
 *
 * Passer la langue explicitement quand on la tient du parametre de route :
 * dans un layout imbrique, la langue de la requete n'est pas toujours encore
 * resolue au moment ou le layout s'execute.
 */
export async function redirectLocalized(path: string, locale?: Locale): Promise<never> {
  const target = locale ?? toLocale(await getLocale());
  // redirect() leve : le `return` transmet son type never a l appelant.
  return redirect(localePath(target, path));
}

/**
 * Langue courante dans un gestionnaire de route.
 *
 * Les routes d'API sortent du perimetre de next-intl : la langue se lit dans
 * le cookie pose par l'intergiciel, puis dans l'adresse d'ou vient l'appel.
 */
export async function localeFromRequest(request: Request): Promise<Locale> {
  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookie && (routing.locales as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    const match = /^\/(fr|en|ar)(?=\/|$)/.exec(new URL(referer).pathname);
    if (match) return match[1] as Locale;
  }

  return routing.defaultLocale;
}

/** Ajoute le prefixe de langue a un chemin, sauf s'il en porte deja un. */
export function withLocale(locale: Locale, path: string): string {
  if (/^\/(fr|en|ar)(\/|$)/.test(path)) return path;
  return localePath(locale, path);
}
