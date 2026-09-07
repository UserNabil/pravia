import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatCard, TableShell, Td, Th, EmptyRow } from "@/components/admin/ui";
import { CopyField } from "@/components/admin/copy-field";
import { ProviderMark } from "@/components/provider-buttons";
import { callbackUrl, providerStatus, type ProviderId } from "@/lib/oauth";
import { getSiteUrl } from "@/lib/seo";
import { formatDate, formatNumber, cn } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Connexions externes" };

/** Ou declarer l'application chez chaque fournisseur. */
const CONSOLES: Record<ProviderId, { url: string; label: string; note: string }> = {
  google: {
    url: "https://console.cloud.google.com/apis/credentials",
    label: "Google Cloud Console",
    note: "Identifiants > Creer un ID client OAuth > Application Web.",
  },
  microsoft: {
    url: "https://entra.microsoft.com",
    label: "Microsoft Entra ID",
    note: "Inscriptions d'applications > Nouvelle inscription > Web. Le secret expire, notez sa date.",
  },
  facebook: {
    url: "https://developers.facebook.com/apps",
    label: "Meta for Developers",
    note: "Produit « Connexion Facebook » > Parametres. L'app doit etre en mode Live.",
  },
  tiktok: {
    url: "https://developers.tiktok.com/apps",
    label: "TikTok for Developers",
    note: "Ajoutez le produit Login Kit et la permission user.info.basic.",
  },
  apple: {
    url: "https://developer.apple.com/account/resources/identifiers/list/serviceId",
    label: "Apple Developer",
    note: "Creez un Services ID, activez Sign in with Apple, puis une cle .p8.",
  },
};

export default async function AdminConnectionsPage() {
  const [siteUrl, accounts, byProvider, usersWithoutPassword] = await Promise.all([
    getSiteUrl(),
    db.account.count(),
    db.account.groupBy({ by: ["provider"], _count: { provider: true } }),
    db.user.count({ where: { passwordHash: null } }),
  ]);

  const statuses = providerStatus();
  const counts = new Map(byProvider.map((row) => [row.provider, row._count.provider]));
  const active = statuses.filter((s) => s.configured).length;

  const recent = await db.account.findMany({
    orderBy: { lastLoginAt: "desc" },
    take: 10,
    include: { user: { select: { name: true, email: true, avatarColor: true } } },
  });

  const isLocal = /localhost|127\.0\.0\.1/.test(siteUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connexions externes"
        subtitle="Google, Microsoft, Facebook, TikTok et Apple."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Fournisseurs actifs"
          value={`${active} / ${statuses.length}`}
          hint={active === 0 ? "Aucun bouton n'apparait sur le site" : "Visibles sur la connexion"}
          Icon={KeyRound}
        />
        <StatCard
          label="Comptes lies"
          value={formatNumber(accounts)}
          hint="Toutes methodes confondues"
          Icon={Users}
        />
        <StatCard
          label="Sans mot de passe"
          value={formatNumber(usersWithoutPassword)}
          hint="Comptes accessibles uniquement en connexion externe"
          Icon={CheckCircle2}
        />
      </div>

      {isLocal && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm text-warning">
            <p className="font-medium">L&apos;adresse du site pointe encore sur localhost.</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              Les URL de rappel ci-dessous en decoulent : renseignez le domaine reel dans
              Referencement avant de declarer les applications chez les fournisseurs, sinon les
              adresses ne correspondront pas et les connexions echoueront.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ fournisseurs */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">Configuration</h2>
          <p className="mt-0.5 text-sm text-muted-2">
            Les identifiants se declarent dans les variables d&apos;environnement, jamais en base.
            Sur le serveur, il s&apos;agit du fichier <code>.env.production</code>. Un fournisseur
            sans identifiants n&apos;affiche simplement aucun bouton.
          </p>
        </div>

        {statuses.map((provider) => (
          <div key={provider.id} className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2">
                  <ProviderMark provider={provider.id} />
                </span>
                <div>
                  <p className="text-sm font-bold">{provider.label}</p>
                  <p className="text-xs text-muted-2">{CONSOLES[provider.id].note}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-2">
                  {counts.get(provider.id) ?? 0} compte(s)
                </span>
                <span
                  className={cn(
                    "chip",
                    provider.configured
                      ? "bg-success/15 text-success"
                      : "bg-surface-3 text-muted-2"
                  )}
                >
                  {provider.configured ? "Actif" : "Non configure"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CopyField
                label="URL de rappel a declarer"
                value={callbackUrl(siteUrl, provider.id)}
                hint="Doit correspondre au caractere pres. C'est la premiere cause d'echec."
              />

              <div>
                <p className="label">Variables attendues</p>
                <ul className="space-y-1">
                  {provider.variables.map((variable) => (
                    <li key={variable}>
                      <code className="text-xs text-muted">{variable}</code>
                    </li>
                  ))}
                </ul>
                <a
                  href={CONSOLES[provider.id].url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {CONSOLES[provider.id].label}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            {provider.id === "apple" && (
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                Apple n&apos;accepte pas de secret statique : il est fabrique a chaque echange a
                partir de la cle <code>.p8</code>. Collez son contenu complet dans
                <code> APPLE_PRIVATE_KEY</code>, en-tetes compris. Apple exige aussi une URL de
                rappel en HTTPS : la connexion Apple ne fonctionne donc pas depuis localhost.
              </p>
            )}

            {provider.id === "tiktok" && (
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                TikTok ne transmet aucune adresse e-mail. Elle est demandee a l&apos;internaute
                juste apres, sur une page dediee, plutot que d&apos;etre inventee.
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ------------------------------------------------------ dernieres */}
      <section>
        <h2 className="mb-3 text-base font-bold tracking-tight">Dernieres connexions</h2>
        <TableShell>
          <thead>
            <tr>
              <Th>Fournisseur</Th>
              <Th>Client</Th>
              <Th>Adresse transmise</Th>
              <Th>Liee le</Th>
              <Th className="text-right">Derniere connexion</Th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <EmptyRow colSpan={5}>Aucune connexion externe pour le moment.</EmptyRow>
            )}
            {recent.map((account) => (
              <tr key={account.id} className="transition-colors hover:bg-surface-2">
                <Td>
                  <span className="flex items-center gap-2">
                    <ProviderMark provider={account.provider as ProviderId} />
                    <span className="text-xs font-medium capitalize">{account.provider}</span>
                  </span>
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
                      style={{ backgroundColor: account.user.avatarColor }}
                    >
                      {account.user.name.slice(0, 1)}
                    </span>
                    <span className="truncate text-xs">{account.user.name}</span>
                  </span>
                </Td>
                <Td className="text-xs text-muted-2">{account.email ?? "—"}</Td>
                <Td className="whitespace-nowrap text-xs text-muted-2">
                  {formatDate(account.createdAt)}
                </Td>
                <Td className="whitespace-nowrap text-right text-xs text-muted-2">
                  {formatDate(account.lastLoginAt)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}
