import { NextResponse } from "next/server";
import { assertNonce, callbackUrl, exchangeCode, getProvider, isProviderId } from "@/lib/oauth";
import { consumeFlow, holdPending } from "@/lib/oauth-state";
import { signInWithProfile } from "@/lib/oauth-link";
import { getSiteUrl } from "@/lib/seo";
import { localeFromRequest, withLocale } from "@/lib/redirect";

export const dynamic = "force-dynamic";

/** Parametres du retour, que le fournisseur reponde en GET ou en POST. */
type CallbackParams = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  /** Apple joint le nom de l'utilisateur a la premiere autorisation. */
  user?: string;
};

function fromQuery(url: string): CallbackParams {
  const params = new URL(url).searchParams;
  return {
    code: params.get("code") ?? undefined,
    state: params.get("state") ?? undefined,
    error: params.get("error") ?? undefined,
    errorDescription: params.get("error_description") ?? undefined,
  };
}

async function fromForm(request: Request): Promise<CallbackParams> {
  const form = await request.formData();
  const value = (key: string) => {
    const entry = form.get(key);
    return typeof entry === "string" ? entry : undefined;
  };
  return {
    code: value("code"),
    state: value("state"),
    error: value("error"),
    errorDescription: value("error_description"),
    user: value("user"),
  };
}

async function failure(request: Request, reason: string) {
  const locale = await localeFromRequest(request);
  const url = new URL(withLocale(locale, "/connexion"), request.url);
  url.searchParams.set("erreur", reason);
  return NextResponse.redirect(url);
}

async function handle(request: Request, id: string, params: CallbackParams) {
  if (!isProviderId(id)) return await failure(request, "fournisseur-inconnu");

  // L'internaute a refuse l'autorisation, ou le fournisseur a refuse la demande.
  if (params.error) {
    console.warn(`[oauth] ${id} a refuse : ${params.error} ${params.errorDescription ?? ""}`);
    return await failure(request, params.error === "access_denied" ? "annule" : "refus-fournisseur");
  }

  const flow = await consumeFlow();
  if (!flow) return await failure(request, "session-expiree");
  if (flow.provider !== id) return await failure(request, "etat-invalide");
  // Comparaison du state : protege contre une requete forgee par un tiers.
  if (!params.state || params.state !== flow.state) return await failure(request, "etat-invalide");
  if (!params.code) return await failure(request, "code-absent");

  const provider = getProvider(id);
  const siteUrl = await getSiteUrl();
  const locale = await localeFromRequest(request);

  try {
    const tokens = await exchangeCode(provider, {
      code: params.code,
      redirectUri: callbackUrl(siteUrl, id),
      verifier: flow.verifier,
    });

    assertNonce(tokens.id_token, flow.nonce);

    const profile = await provider.profile(tokens, { userPayload: params.user });
    const outcome = await signInWithProfile(id, profile);

    if (outcome.status === "needs-email") {
      const secure = new URL(siteUrl).protocol === "https:";
      await holdPending({ provider: id, profile, redirectTo: flow.redirectTo }, secure);
      return NextResponse.redirect(
        new URL(withLocale(locale, "/connexion/finaliser"), request.url)
      );
    }

    return NextResponse.redirect(new URL(withLocale(locale, flow.redirectTo), request.url));
  } catch (error) {
    // Le detail part dans les journaux du serveur ; l'internaute ne voit
    // qu'un message generique, sans indice exploitable.
    console.error(`[oauth] echec ${id} :`, error);
    return await failure(request, "echec-fournisseur");
  }
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  return handle(request, provider, fromQuery(request.url));
}

/** Apple repond en form_post des que le nom ou l'e-mail sont demandes. */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  return handle(request, provider, await fromForm(request));
}
