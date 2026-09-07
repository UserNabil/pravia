import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  callbackUrl,
  getProvider,
  isProviderId,
} from "@/lib/oauth";
import { challengeFor, createVerifier, randomToken, startFlow } from "@/lib/oauth-state";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Depart d'une connexion externe : /api/auth/google, /api/auth/apple...
 *
 * L'adresse de rappel est construite a partir du domaine configure dans le
 * back-office. Elle doit correspondre au caractere pres a celle declaree chez
 * le fournisseur, c'est la source d'erreur la plus frequente.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: id } = await context.params;

  if (!isProviderId(id)) {
    return NextResponse.redirect(new URL("/connexion?erreur=fournisseur-inconnu", request.url));
  }

  const provider = getProvider(id);
  if (!provider.isConfigured()) {
    return NextResponse.redirect(
      new URL(`/connexion?erreur=non-configure&fournisseur=${id}`, request.url)
    );
  }

  const requested = new URL(request.url).searchParams.get("redirectTo") ?? "";
  // Seul un chemin interne est accepte, jamais une URL absolue.
  const redirectTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/compte";

  const state = randomToken();
  const nonce = randomToken();
  const verifier = createVerifier();
  const siteUrl = await getSiteUrl();
  const redirectUri = callbackUrl(siteUrl, id);

  const secure = new URL(siteUrl).protocol === "https:";
  await startFlow({ provider: id, state, verifier, nonce, redirectTo }, secure);

  const authorizeUrl = buildAuthorizeUrl(provider, {
    redirectUri,
    state,
    nonce,
    challenge: provider.usesPkce ? await challengeFor(verifier) : undefined,
  });

  return NextResponse.redirect(authorizeUrl);
}
