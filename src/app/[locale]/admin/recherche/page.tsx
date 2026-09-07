import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, RefreshCw, Search, Trash2, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyRow, PageHeader, StatCard, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/actions-ui";
import { SynonymForm } from "@/components/admin/synonym-form";
import {
  clearSearchLogAction,
  deleteSynonymAction,
  rebuildSearchIndexAction,
  saveSynonymAction,
} from "@/app/actions/admin";
import { formatNumber, formatDate } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.search");
  return { title: t("title") };
}

export default async function AdminSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale: rawLocale }, t] = await Promise.all([params, getTranslations("admin.search")]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [queries, synonyms, totalSearches, indexedCount, missingIndex] = await Promise.all([
    db.searchQuery.findMany({ where: { createdAt: { gte: since } } }),
    db.searchSynonym.findMany({ orderBy: { term: "asc" } }),
    db.searchQuery.count(),
    db.product.count({ where: { NOT: { searchText: "" } } }),
    db.product.count({ where: { searchText: "" } }),
  ]);

  // Agregation par terme : volume et taux d'echec.
  const grouped = new Map<string, { term: string; count: number; zero: number }>();
  for (const query of queries) {
    const entry = grouped.get(query.normalized) ?? { term: query.term, count: 0, zero: 0 };
    entry.count += 1;
    if (query.results === 0) entry.zero += 1;
    grouped.set(query.normalized, entry);
  }

  const ranked = [...grouped.values()].sort((a, b) => b.count - a.count);
  const topSearches = ranked.slice(0, 12);
  const zeroResults = ranked.filter((row) => row.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 12);

  const zeroRate = queries.length
    ? (queries.filter((q) => q.results === 0).length / queries.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("searches30")}
          value={formatNumber(queries.length, tag)}
          hint={t("sinceOpening", { count: formatNumber(totalSearches, tag) })}
          Icon={Search}
        />
        <StatCard
          label={t("distinctTerms")}
          value={formatNumber(grouped.size, tag)}
          Icon={TrendingUp}
        />
        <StatCard
          label={t("zeroResults")}
          value={`${zeroRate.toFixed(1)} %`}
          hint={t("zeroResultsHint")}
          Icon={AlertTriangle}
        />
        <StatCard
          label={t("indexedProducts")}
          value={formatNumber(indexedCount, tag)}
          hint={missingIndex > 0 ? t("outOfIndex", { count: missingIndex }) : t("indexComplete")}
          Icon={RefreshCw}
        />
      </div>

      {missingIndex > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="flex-1 text-sm text-warning">
            {t("missingIndexWarning", { count: missingIndex })}
          </p>
          <form action={rebuildSearchIndexAction}>
            <button type="submit" className="btn btn-secondary text-xs">
              <RefreshCw className="size-3.5" />
              {t("rebuildIndex")}
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold">{t("topSearches")}</h2>
            <span className="text-xs text-muted-2">{t("last30Days")}</span>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>{t("colTerm")}</Th>
                <Th className="text-end">{t("colSearches")}</Th>
                <Th className="text-end">{t("colZero")}</Th>
                <Th className="text-end">{t("colView")}</Th>
              </tr>
            </thead>
            <tbody>
              {topSearches.length === 0 && (
                <EmptyRow colSpan={4}>{t("noSearches")}</EmptyRow>
              )}
              {topSearches.map((row) => (
                <tr key={row.term} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{row.term}</Td>
                  <Td className="text-end tabular-nums">{row.count}</Td>
                  <Td className="text-end tabular-nums">
                    {row.zero > 0 ? (
                      <span className="text-warning">{row.zero}</span>
                    ) : (
                      <span className="text-muted-2">0</span>
                    )}
                  </Td>
                  <Td className="text-end">
                    <Link
                      href={`/produits?q=${encodeURIComponent(row.term)}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("test")}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          {totalSearches > 0 && (
            <div className="mt-3 flex justify-end">
              <ConfirmButton
                action={clearSearchLogAction}
                confirmLabel={t("clearLog")}
                successMessage={t("logCleared")}
                className="btn btn-ghost text-xs"
              >
                <Trash2 className="size-3.5" />
                {t("clearLog")}
              </ConfirmButton>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold">{t("failedSearches")}</h2>
            <p className="mt-0.5 text-xs text-muted-2">{t("failedSearchesHint")}</p>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>{t("colTerm")}</Th>
                <Th className="text-end">{t("colFailures")}</Th>
                <Th className="text-end">{t("colAction")}</Th>
              </tr>
            </thead>
            <tbody>
              {zeroResults.length === 0 && (
                <EmptyRow colSpan={3}>{t("allSucceed")}</EmptyRow>
              )}
              {zeroResults.map((row) => (
                <tr key={row.term} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{row.term}</Td>
                  <Td className="text-end tabular-nums text-warning">{row.zero}</Td>
                  <Td className="text-end">
                    <Link
                      href={`/admin/produits?q=${encodeURIComponent(row.term)}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("searchCatalogue")}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </section>
      </div>

      {/* -------------------------------------------------------- synonymes */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold">{t("synonyms")}</h2>
          <p className="mt-0.5 text-xs text-muted-2">{t("synonymsHint")}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
          <TableShell>
            <thead>
              <tr>
                <Th>{t("colSearchTerm")}</Th>
                <Th>{t("colReplacedBy")}</Th>
                <Th className="text-end">{t("colActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {synonyms.length === 0 && <EmptyRow colSpan={3}>{t("noSynonyms")}</EmptyRow>}
              {synonyms.map((synonym) => (
                <tr key={synonym.id} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{synonym.term}</Td>
                  <Td className="text-muted">{synonym.targets}</Td>
                  <Td className="text-end">
                    <ConfirmButton
                      action={deleteSynonymAction.bind(null, synonym.id)}
                      confirmLabel={t("confirmDelete")}
                      successMessage={t("synonymDeleted")}
                      className="ms-auto flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </ConfirmButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          <SynonymForm action={saveSynonymAction} />
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{t("indexTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-2">{t("indexHint")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={rebuildSearchIndexAction}>
            <button type="submit" className="btn btn-secondary">
              <RefreshCw className="size-4" />
              {t("rebuildFullIndex")}
            </button>
          </form>
          <span className="text-xs text-muted-2">
            {t("indexStatus", {
              count: formatNumber(indexedCount, tag),
              date: formatDate(new Date(), tag),
            })}
          </span>
        </div>
      </section>
    </div>
  );
}
