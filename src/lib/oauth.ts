import "server-only";
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";

/**
 * Connexion par fournisseur externe.
 *
 * Le flux est le meme partout : redirection vers le fournisseur, retour avec
 * un code, echange du code contre un jeton, lecture du profil. Ce module
 * absorbe les particularites de chacun pour que les routes restent identiques.
 *
 * Un fournisseur dont les identifiants ne sont pas renseignes est simplement
 * absent de l'interface : aucun bouton ne mene a une erreur.
 */

export const PROVIDER_IDS = ["google", "microsoft", "facebook", "tiktok", "apple"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Profil ramene a une forme commune, quelle que soit la source. */
export type ExternalProfile = {
  providerAccountId: string;
  email: string | null;
  /** Une adresse non verifiee ne doit jamais rattacher a un compte existant. */
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

type TokenResponse = { access_token?: string; id_token?: string; [key: string]: unknown };

type Provider = {
  id: ProviderId;
  label: string;
  /** Couleur de marque, utilisee par le bouton. */
  accent: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** TikTok nomme son identifiant client "client_key". */
  clientIdParam?: string;
  /** Apple renvoie le resultat en POST lorsqu'on demande le nom et l'e-mail. */
  formPost?: boolean;
  usesPkce: boolean;
  /** Parametres supplementaires sur l'URL d'autorisation. */
  extraAuthParams?: Record<string, string>;
  isConfigured: () => boolean;
  clientId: () => string;
  clientSecret: () => Promise<string>;
  profile: (tokens: TokenResponse, extra: { userPayload?: string }) => Promise<ExternalProfile>;
};

/* ------------------------------------------------------------ jetons OIDC */

const JWKS = {
  google: createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
  microsoft: createRemoteJWKSet(new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")),
  apple: createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
};

/**
 * Verifie la signature d'un jeton d'identite aupres du fournisseur.
 *
 * La specification OpenID Connect autorise a s'en dispenser lorsque le jeton
 * provient d'un appel direct au point de terminaison, mais la verification
 * coute peu et protege d'une reponse alteree.
 */
async function readIdToken(
  idToken: string,
  issuer: keyof typeof JWKS,
  audience: string
): Promise<Record<string, unknown>> {
  try {
    const { payload } = await jwtVerify(idToken, JWKS[issuer], { audience });
    return payload as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Jeton d'identite ${issuer} refuse : ${error instanceof Error ? error.message : "invalide"}`
    );
  }
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/* ---------------------------------------------------------------- Apple */

/**
 * Apple n'accepte pas de secret statique : il faut lui presenter un jeton
 * signe en ES256 avec la cle privee du compte developpeur, valable six mois
 * au plus. On le fabrique a chaque echange.
 */
async function appleClientSecret(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  // La cle .p8 tient sur plusieurs lignes : dans une variable d'environnement
  // les sauts sont souvent echappes.
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const key = await importPKCS8(privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(key);
}

/* ------------------------------------------------------------- registre */

const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    id: "google",
    label: "Google",
    accent: "#ea4335",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    usesPkce: true,
    extraAuthParams: { access_type: "online", prompt: "select_account" },
    isConfigured: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: () => process.env.GOOGLE_CLIENT_ID!,
    clientSecret: async () => process.env.GOOGLE_CLIENT_SECRET!,
    profile: async (tokens) => {
      if (!tokens.id_token) throw new Error("Google n'a pas renvoye de jeton d'identite.");
      const claims = await readIdToken(tokens.id_token, "google", process.env.GOOGLE_CLIENT_ID!);
      return {
        providerAccountId: String(claims.sub),
        email: text(claims.email),
        emailVerified: claims.email_verified === true,
        name: text(claims.name),
        avatarUrl: text(claims.picture),
      };
    },
  },

  microsoft: {
    id: "microsoft",
    label: "Microsoft",
    accent: "#0078d4",
    // "common" accepte comptes personnels et professionnels ; renseignez
    // MICROSOFT_TENANT pour restreindre a un annuaire precis.
    get authorizeUrl() {
      return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT ?? "common"}/oauth2/v2.0/authorize`;
    },
    get tokenUrl() {
      return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT ?? "common"}/oauth2/v2.0/token`;
    },
    scope: "openid email profile",
    usesPkce: true,
    extraAuthParams: { prompt: "select_account" },
    isConfigured: () =>
      Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    clientId: () => process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: async () => process.env.MICROSOFT_CLIENT_SECRET!,
    profile: async (tokens) => {
      if (!tokens.id_token) throw new Error("Microsoft n'a pas renvoye de jeton d'identite.");
      // Les jetons multi-tenant sont emis par des autorites differentes : seule
      // l'audience est verifiable de maniere fiable ici.
      const claims = await readIdToken(
        tokens.id_token,
        "microsoft",
        process.env.MICROSOFT_CLIENT_ID!
      );
      // Le champ email est absent de certains comptes professionnels ;
      // preferred_username contient alors l'adresse de connexion.
      const candidate = text(claims.email) ?? text(claims.preferred_username);
      const email = candidate && candidate.includes("@") ? candidate : null;
      return {
        providerAccountId: String(claims.oid ?? claims.sub),
        email,
        emailVerified: Boolean(email),
        name: text(claims.name),
        avatarUrl: null,
      };
    },
  },

  facebook: {
    id: "facebook",
    label: "Facebook",
    accent: "#1877f2",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email public_profile",
    usesPkce: true,
    isConfigured: () =>
      Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    clientId: () => process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: async () => process.env.FACEBOOK_CLIENT_SECRET!,
    profile: async (tokens) => {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${tokens.access_token}`
      );
      if (!response.ok) throw new Error(`Profil Facebook illisible (HTTP ${response.status}).`);
      const data = (await response.json()) as {
        id: string;
        name?: string;
        email?: string;
        picture?: { data?: { url?: string } };
      };
      return {
        providerAccountId: data.id,
        email: text(data.email),
        // Facebook ne renvoie une adresse que si elle est confirmee.
        emailVerified: Boolean(data.email),
        name: text(data.name),
        avatarUrl: text(data.picture?.data?.url),
      };
    },
  },

  tiktok: {
    id: "tiktok",
    label: "TikTok",
    accent: "#010101",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scope: "user.info.basic",
    // TikTok attend client_key la ou les autres attendent client_id.
    clientIdParam: "client_key",
    usesPkce: true,
    isConfigured: () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    clientId: () => process.env.TIKTOK_CLIENT_KEY!,
    clientSecret: async () => process.env.TIKTOK_CLIENT_SECRET!,
    profile: async (tokens) => {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!response.ok) throw new Error(`Profil TikTok illisible (HTTP ${response.status}).`);
      const payload = (await response.json()) as {
        data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } };
        error?: { code?: string; message?: string };
      };
      const user = payload.data?.user;
      if (!user?.open_id) {
        throw new Error(payload.error?.message ?? "TikTok n'a pas renvoye d'identifiant.");
      }
      return {
        providerAccountId: user.open_id,
        // TikTok ne communique aucune adresse e-mail : elle sera demandee a
        // l'utilisateur lors de la finalisation du compte.
        email: null,
        emailVerified: false,
        name: text(user.display_name),
        avatarUrl: text(user.avatar_url),
      };
    },
  },

  apple: {
    id: "apple",
    label: "Apple",
    accent: "#000000",
    authorizeUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scope: "name email",
    // Des que le nom ou l'e-mail sont demandes, Apple impose le retour en POST.
    formPost: true,
    // Apple ne prend pas en charge PKCE sur le flux web.
    usesPkce: false,
    isConfigured: () =>
      Boolean(
        process.env.APPLE_CLIENT_ID &&
          process.env.APPLE_TEAM_ID &&
          process.env.APPLE_KEY_ID &&
          process.env.APPLE_PRIVATE_KEY
      ),
    clientId: () => process.env.APPLE_CLIENT_ID!,
    clientSecret: appleClientSecret,
    profile: async (tokens, extra) => {
      if (!tokens.id_token) throw new Error("Apple n'a pas renvoye de jeton d'identite.");
      const claims = await readIdToken(tokens.id_token, "apple", process.env.APPLE_CLIENT_ID!);

      // Apple ne transmet le nom qu'a la toute premiere autorisation, dans un
      // champ de formulaire distinct du jeton.
      let name: string | null = null;
      if (extra.userPayload) {
        try {
          const parsed = JSON.parse(extra.userPayload) as {
            name?: { firstName?: string; lastName?: string };
          };
          name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ") || null;
        } catch {
          // Charge utile inexploitable : le nom sera demande autrement.
        }
      }

      return {
        providerAccountId: String(claims.sub),
        email: text(claims.email),
        // Apple represente ce drapeau tantot en booleen, tantot en chaine.
        emailVerified: claims.email_verified === true || claims.email_verified === "true",
        name,
        avatarUrl: null,
      };
    },
  },
};

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS[id];
}

/** Fournisseurs reellement utilisables, dans l'ordre d'affichage. */
export function configuredProviders(): { id: ProviderId; label: string; accent: string }[] {
  return PROVIDER_IDS.filter((id) => PROVIDERS[id].isConfigured()).map((id) => ({
    id,
    label: PROVIDERS[id].label,
    accent: PROVIDERS[id].accent,
  }));
}

/** Etat de configuration de chaque fournisseur, pour le back-office. */
export function providerStatus(): {
  id: ProviderId;
  label: string;
  accent: string;
  configured: boolean;
  variables: string[];
}[] {
  const variables: Record<ProviderId, string[]> = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    microsoft: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT (facultatif)"],
    facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    apple: ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"],
  };

  return PROVIDER_IDS.map((id) => ({
    id,
    label: PROVIDERS[id].label,
    accent: PROVIDERS[id].accent,
    configured: PROVIDERS[id].isConfigured(),
    variables: variables[id],
  }));
}

export function callbackUrl(siteUrl: string, provider: ProviderId): string {
  return `${siteUrl.replace(/\/+$/, "")}/api/auth/${provider}/callback`;
}

/* ------------------------------------------------------------- flux OAuth */

/** URL d'autorisation, vers laquelle l'internaute est redirige. */
export function buildAuthorizeUrl(
  provider: Provider,
  options: { redirectUri: string; state: string; challenge?: string; nonce: string }
): string {
  const url = new URL(provider.authorizeUrl);
  const params = url.searchParams;

  params.set(provider.clientIdParam ?? "client_id", provider.clientId());
  params.set("redirect_uri", options.redirectUri);
  params.set("response_type", "code");
  params.set("scope", provider.scope);
  params.set("state", options.state);

  if (provider.scope.includes("openid")) params.set("nonce", options.nonce);
  if (provider.formPost) params.set("response_mode", "form_post");
  if (provider.usesPkce && options.challenge) {
    params.set("code_challenge", options.challenge);
    params.set("code_challenge_method", "S256");
  }
  for (const [key, value] of Object.entries(provider.extraAuthParams ?? {})) {
    params.set(key, value);
  }

  return url.toString();
}

/** Echange le code d'autorisation contre les jetons. */
export async function exchangeCode(
  provider: Provider,
  options: { code: string; redirectUri: string; verifier?: string }
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
    client_secret: await provider.clientSecret(),
  });
  body.set(provider.clientIdParam ?? "client_id", provider.clientId());
  if (provider.usesPkce && options.verifier) body.set("code_verifier", options.verifier);

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const raw = await response.text();
  let payload: TokenResponse;
  try {
    payload = JSON.parse(raw) as TokenResponse;
  } catch {
    throw new Error(`Reponse inattendue de ${provider.label} : ${raw.slice(0, 200)}`);
  }

  if (!response.ok || payload.error) {
    const detail =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : `HTTP ${response.status}`;
    throw new Error(`Echange de jeton refuse par ${provider.label} : ${detail}`);
  }

  return payload;
}

/** Verifie que le nonce du jeton correspond a celui de la demande. */
export function assertNonce(idToken: string | undefined, expected: string): void {
  if (!idToken) return;
  const claims = decodeJwt(idToken);
  if (claims.nonce && claims.nonce !== expected) {
    throw new Error("Le nonce du jeton d'identite ne correspond pas a la demande.");
  }
}
