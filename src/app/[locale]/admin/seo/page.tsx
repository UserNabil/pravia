import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileCode2,
  Globe,
  Info,
  Search,
} from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { SeoPageForm, SeoSettingsForm, type SeoPageRow } from "@/components/admin/seo-forms";
import { saveSeoPageAction, saveSeoSettingsAction } from "@/app/actions/admin";
import { getSeoSettings, SEO_DEFAULTS } from "@/lib/seo";
import { auditSeo } from "@/lib/seo-audit";
import { formatNumber, cn } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.seo");
  return { title: t("title") };
}

/** Pages editoriales proposees a l'edition, meme si rien n'est encore en base. */
const MANAGED_PAGES: { path: string; key: string }[] = [
  { path: "/", key: "pageHome" },
  { path: "/produits", key: "pageCatalogue" },
  { path: "/aide", key: "pageHelp" },
  { path: "/inscription", key: "pageSignUp" },
  { path: "/connexion", key: "pageSignIn" },
];

const LEVEL_STYLES = {
  error: { chip: "bg-danger/15 text-danger", Icon: AlertTriangle },
  warning: { chip: "bg-warning/15 text-warning", Icon: AlertTriangle },
  info: { chip: "bg-primary-soft text-primary", Icon: Info },
} as const;

export default async function AdminSeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale: rawLocale }, t] = await Promise.all([params, getTranslations("admin.seo")]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const [settings, audit, storedPages] = await Promise.all([
    getSeoSettings(),
    auditSeo(),
    db.seoPage.findMany(),
  ]);

  const byPath = new Map(storedPages.map((page) => [page.path, page]));

  const pages: SeoPageRow[] = MANAGED_PAGES.map(({ path, key }) => {
    const stored = byPath.get(path);
    return {
      path,
      label: stored?.label ?? t(key),
      metaTitle: stored?.metaTitle ?? "",
      metaDescription: stored?.metaDescription ?? "",
      ogImage: stored?.ogImage ?? "",
      noIndex: stored?.noIndex ?? false,
      inSitemap: stored?.inSitemap ?? true,
      changeFrequency: stored?.changeFrequency ?? "weekly",
      priority: stored?.priority ?? 0.5,
    };
  });

  const scoreTone =
    audit.score >= 85 ? "text-success" : audit.score >= 60 ? "text-warning" : "text-danger";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary text-xs"
            >
              <FileCode2 className="size-3.5" />
              sitemap.xml
              <ArrowUpRight className="size-3" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary text-xs"
            >
              <FileCode2 className="size-3.5" />
              robots.txt
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        }
      />

      {/* ------------------------------------------------------ diagnostic */}
      <section className="grid gap-4 lg:grid-cols-[16rem_1fr] lg:items-start">
        <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-medium text-muted-2">{t("score")}</p>
          <p className={cn("mt-1 text-5xl font-extrabold tabular-nums tracking-tight", scoreTone)}>
            {audit.score}
          </p>
          <p className="mt-1 text-xs text-muted-2">{t("outOf100")}</p>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                audit.score >= 85 ? "bg-success" : audit.score >= 60 ? "bg-warning" : "bg-danger"
              )}
              style={{ width: `${audit.score}%` }}
            />
          </div>

          <dl className="mt-5 grid w-full grid-cols-2 gap-3 text-start">
            <Metric
              label={t("indexedProducts")}
              value={formatNumber(audit.counts.indexedProducts, tag)}
            />
            <Metric label={t("customMeta")} value={formatNumber(audit.counts.customMeta, tag)} />
            <Metric label={t("errors")} value={formatNumber(audit.counts.errors, tag)} />
            <Metric label={t("warnings")} value={formatNumber(audit.counts.warnings, tag)} />
          </dl>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("issues")}</h2>

          {audit.issues.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              {t("noIssues")}
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {audit.issues.map((issue) => {
                const { chip, Icon } = LEVEL_STYLES[issue.level];
                return (
                  <li key={issue.title} className="flex items-start gap-3 rounded-lg bg-surface-2 p-3">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        chip
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-2">{issue.detail}</p>
                    </div>
                    {issue.href && (
                      <Link
                        href={issue.href}
                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                      >
                        {t("fix")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* -------------------------------------------------- reglages globaux */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
          <Globe className="size-4 text-muted" />
          {t("generalSettings")}
        </h2>
        <SeoSettingsForm
          action={saveSeoSettingsAction}
          values={{ ...SEO_DEFAULTS, ...settings }}
          indexable={settings["seo.indexable"] === "1"}
        />
      </section>

      {/* --------------------------------------------------------- par page */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-tight">
          <Search className="size-4 text-muted" />
          {t("perPage")}
        </h2>
        <p className="mb-3 text-sm text-muted-2">{t("perPageHint")}</p>

        <div className="space-y-4">
          {pages.map((page) => (
            <SeoPageForm key={page.path} action={saveSeoPageAction} page={page} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-2">
      <dt className="text-[0.6875rem] text-muted-2">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums">{value}</dd>
    </div>
  );
}
