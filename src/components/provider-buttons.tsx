import type { ProviderId } from "@/lib/oauth";

/**
 * Logos des fournisseurs d'identite.
 *
 * Ils sont trace en SVG plutot que charges depuis un CDN : la page de
 * connexion ne depend ainsi d'aucune ressource externe, et les marques
 * conservent leurs couleurs officielles, condition posee par leurs chartes
 * pour les boutons de connexion.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A11.995 11.995 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.28 6.61l4.01 3.11C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10.2v10.2H1z" />
      <path fill="#7FBA00" d="M12.8 1H23v10.2H12.8z" />
      <path fill="#00A4EF" d="M1 12.8h10.2V23H1z" />
      <path fill="#FFB900" d="M12.8 12.8H23V23H12.8z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#25F4EE"
        d="M9.38 9.34v-1.1a8.3 8.3 0 0 0-1.13-.08A8.28 8.28 0 0 0 3.6 22.9a8.25 8.25 0 0 1-2.2-5.62 8.28 8.28 0 0 1 7.98-7.94z"
      />
      <path
        fill="#FE2C55"
        d="M9.55 20.1a3.79 3.79 0 0 0 3.78-3.65V.99h3.3a6.3 6.3 0 0 1-.1-1.1h-4.51v15.46a3.79 3.79 0 0 1-5.56 3.3 3.78 3.78 0 0 0 3.09 1.45z"
      />
      <path
        fill="currentColor"
        d="M19.32 6.87V5.83a6.24 6.24 0 0 1-3.4-1.01 6.28 6.28 0 0 0 3.4 2.05zM12.02-.11H8.63v15.47a3.79 3.79 0 0 1-5.6 3.31 3.79 3.79 0 0 0 6.52-2.63V.6h3.4a6.3 6.3 0 0 1-.1-.71zM19.32 6.87v3.35a10.77 10.77 0 0 1-6.3-2.03v7.28a8.28 8.28 0 0 1-8.28 8.27c-.4 0-.79-.03-1.17-.08a8.28 8.28 0 0 0 9.45-8.19V8.19a10.77 10.77 0 0 0 6.3 2.03V6.9c-.34 0-.67-.03-1-.09z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.05 12.54c-.03-2.7 2.2-4 2.3-4.06-1.25-1.83-3.2-2.08-3.9-2.11-1.66-.17-3.24.98-4.08.98-.84 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.09 1.35 10.73.9 1.29 1.97 2.74 3.38 2.69 1.36-.06 1.87-.88 3.51-.88 1.64 0 2.1.88 3.53.85 1.46-.03 2.38-1.32 3.27-2.62 1.03-1.5 1.46-2.95 1.48-3.03-.03-.01-2.84-1.09-2.87-4.32zM14.4 4.6c.74-.9 1.24-2.15 1.1-3.4-1.07.04-2.36.71-3.13 1.61-.68.79-1.28 2.06-1.12 3.28 1.19.09 2.41-.61 3.15-1.49z"
      />
    </svg>
  );
}

const MARKS: Record<ProviderId, () => React.ReactElement> = {
  google: GoogleMark,
  microsoft: MicrosoftMark,
  facebook: FacebookMark,
  tiktok: TikTokMark,
  apple: AppleMark,
};

export function ProviderMark({ provider }: { provider: ProviderId }) {
  const Mark = MARKS[provider];
  return <Mark />;
}

export function ProviderButtons({
  providers,
  redirectTo,
  action = "Continuer avec",
}: {
  providers: { id: ProviderId; label: string }[];
  redirectTo?: string;
  action?: string;
}) {
  if (!providers.length) return null;

  const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-2">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-2">
        {providers.map((provider) => (
          <a
            key={provider.id}
            // Lien plein et non bouton : le navigateur quitte le site vers le
            // fournisseur, une navigation cote client n'aurait pas de sens.
            href={`/api/auth/${provider.id}${query}`}
            className="btn btn-secondary w-full justify-center py-2.5"
          >
            <ProviderMark provider={provider.id} />
            <span>
              {action} {provider.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
