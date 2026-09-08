import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatCard, TableShell, Td, Th, EmptyRow } from "@/components/admin/ui";
import { CopyField } from "@/components/admin/copy-field";
import { ProviderMark } from "@/components/provider-buttons";
import { callbackUrl, providerStatus, type ProviderId } from "@/lib/oauth";
import { getSiteUrl } from "@/lib/seo";
import { formatDate, formatNumber, cn } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.connections");
  return { title: t("title") };
}

/** Ou declarer l'application chez chaque fournisseur ; la note est traduite. */
const CONSOLES: Record<ProviderId, { url: string; label: string; noteKey: string }> = {
  google: {
    url: "https://console.cloud.google.com/apis/credentials",
    label: "Google Cloud Console",
    noteKey: "noteGoogle",
  },
  microsoft: {
    url: "https://entra.microsoft.com",
    label: "Microsoft Entra ID",
    noteKey: "noteMicrosoft",
  },
  facebook: {
    url: "https://developers.facebook.com/apps",
    label: "Meta for Developers",
    noteKey: "noteFacebook",
  },
  tiktok: {
    url: "https://developers.tiktok.com/apps",
    label: "TikTok for Developers",
    noteKey: "noteTiktok",
  },
  apple: {
    url: "https://developer.apple.com/account/resources/identifiers/list/serviceId",
    label: "Apple Developer",
    noteKey: "noteApple",
  },
};

export default async function AdminConnectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const t = await getTranslations("admin.connections");
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

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
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t("activeProviders")}
          value={`${active} / ${statuses.length}`}
          hint={active === 0 ? t("noneVisible") : t("visibleOnSignIn")}
          Icon={KeyRound}
        />
        <StatCard
          label={t("linkedAccounts")}
          value={formatNumber(accounts, tag)}
          hint={t("allMethods")}
          Icon={Users}
        />
        <StatCard
          label={t("withoutPassword")}
          value={formatNumber(usersWithoutPassword, tag)}
          hint={t("withoutPasswordHint")}
          Icon={CheckCircle2}
        />
      </div>

      {isLocal && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm text-warning">
            <p className="font-medium">{t("localhostTitle")}</p>
            <p className="mt-0.5 text-xs leading-relaxed">{t("localhostText")}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ fournisseurs */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">{t("configuration")}</h2>
          <p className="mt-0.5 text-sm text-muted-2">{t("configurationHint")}</p>
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
                  <p className="text-xs text-muted-2">{t(CONSOLES[provider.id].noteKey)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-2">
                  {t("accountCount", { count: counts.get(provider.id) ?? 0 })}
                </span>
                <span
                  className={cn(
                    "chip",
                    provider.configured
                      ? "bg-success/15 text-success"
                      : "bg-surface-3 text-muted-2"
                  )}
                >
                  {provider.configured ? t("active") : t("notConfigured")}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CopyField
                label={t("callbackUrl")}
                value={callbackUrl(siteUrl, provider.id)}
                hint={t("callbackHint")}
              />

              <div>
                <p className="label">{t("expectedVariables")}</p>
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
                {t("appleNote")}
              </p>
            )}

            {provider.id === "tiktok" && (
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                {t("tiktokNote")}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ------------------------------------------------------ dernieres */}
      <section>
        <h2 className="mb-3 text-base font-bold tracking-tight">{t("recent")}</h2>
        <TableShell>
          <thead>
            <tr>
              <Th>{t("colProvider")}</Th>
              <Th>{t("colCustomer")}</Th>
              <Th>{t("colEmail")}</Th>
              <Th>{t("colLinkedOn")}</Th>
              <Th className="text-end">{t("colLastLogin")}</Th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <EmptyRow colSpan={5}>{t("empty")}</EmptyRow>
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
                <Td className="text-xs text-muted-2">
                  <span dir="ltr">{account.email ?? "—"}</span>
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted-2">
                  {formatDate(account.createdAt, tag)}
                </Td>
                <Td className="whitespace-nowrap text-end text-xs text-muted-2">
                  {formatDate(account.lastLoginAt, tag)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}
