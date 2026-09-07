import Link from "next/link";
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

export const dynamic = "force-dynamic";

export const metadata = { title: "Recherche interne" };

export default async function AdminSearchPage() {
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
        title="Recherche interne"
        subtitle="Ce que cherchent vos visiteurs, et ce qu'ils ne trouvent pas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recherches (30 j)"
          value={formatNumber(queries.length)}
          hint={`${formatNumber(totalSearches)} depuis l'ouverture`}
          Icon={Search}
        />
        <StatCard
          label="Termes distincts"
          value={formatNumber(grouped.size)}
          Icon={TrendingUp}
        />
        <StatCard
          label="Recherches sans resultat"
          value={`${zeroRate.toFixed(1)} %`}
          hint="A traiter par un synonyme ou un nouveau produit"
          Icon={AlertTriangle}
        />
        <StatCard
          label="Produits indexes"
          value={formatNumber(indexedCount)}
          hint={missingIndex > 0 ? `${missingIndex} hors index` : "Index complet"}
          Icon={RefreshCw}
        />
      </div>

      {missingIndex > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="flex-1 text-sm text-warning">
            {missingIndex} produit(s) sans texte indexe : ils sont introuvables par la recherche.
          </p>
          <form action={rebuildSearchIndexAction}>
            <button type="submit" className="btn btn-secondary text-xs">
              <RefreshCw className="size-3.5" />
              Reconstruire l&apos;index
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold">Recherches les plus frequentes</h2>
            <span className="text-xs text-muted-2">30 derniers jours</span>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>Terme</Th>
                <Th className="text-right">Recherches</Th>
                <Th className="text-right">Sans resultat</Th>
                <Th className="text-right">Voir</Th>
              </tr>
            </thead>
            <tbody>
              {topSearches.length === 0 && (
                <EmptyRow colSpan={4}>Aucune recherche enregistree sur la periode.</EmptyRow>
              )}
              {topSearches.map((row) => (
                <tr key={row.term} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{row.term}</Td>
                  <Td className="text-right tabular-nums">{row.count}</Td>
                  <Td className="text-right tabular-nums">
                    {row.zero > 0 ? (
                      <span className="text-warning">{row.zero}</span>
                    ) : (
                      <span className="text-muted-2">0</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/produits?q=${encodeURIComponent(row.term)}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Tester
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
                confirmLabel="Vider le journal"
                successMessage="Journal de recherche vide."
                className="btn btn-ghost text-xs"
              >
                <Trash2 className="size-3.5" />
                Vider le journal
              </ConfirmButton>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold">Recherches infructueuses</h2>
            <p className="mt-0.5 text-xs text-muted-2">
              Chaque ligne est une vente potentielle manquee : ajoutez un synonyme ou le produit
              correspondant.
            </p>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>Terme</Th>
                <Th className="text-right">Echecs</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {zeroResults.length === 0 && (
                <EmptyRow colSpan={3}>
                  Toutes les recherches aboutissent. Rien a corriger.
                </EmptyRow>
              )}
              {zeroResults.map((row) => (
                <tr key={row.term} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{row.term}</Td>
                  <Td className="text-right tabular-nums text-warning">{row.zero}</Td>
                  <Td className="text-right">
                    <Link
                      href={`/admin/produits?q=${encodeURIComponent(row.term)}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Chercher au catalogue
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
          <h2 className="text-sm font-bold">Synonymes</h2>
          <p className="mt-0.5 text-xs text-muted-2">
            Redirigez le vocabulaire de vos visiteurs vers celui de votre catalogue. La substitution
            s&apos;applique a la requete entiere comme a chaque mot.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
          <TableShell>
            <thead>
              <tr>
                <Th>Terme recherche</Th>
                <Th>Remplace par</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {synonyms.length === 0 && <EmptyRow colSpan={3}>Aucun synonyme defini.</EmptyRow>}
              {synonyms.map((synonym) => (
                <tr key={synonym.id} className="transition-colors hover:bg-surface-2">
                  <Td className="font-medium">{synonym.term}</Td>
                  <Td className="text-muted">{synonym.targets}</Td>
                  <Td className="text-right">
                    <ConfirmButton
                      action={deleteSynonymAction.bind(null, synonym.id)}
                      confirmLabel="Supprimer"
                      successMessage="Synonyme supprime."
                      className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
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
        <h2 className="text-sm font-bold">Index de recherche</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-2">
          Chaque produit possede un texte indexe (titre, marque, categorie, caracteristiques),
          normalise sans accents ni majuscules. Il est recalcule automatiquement a chaque
          enregistrement. Une reconstruction manuelle n&apos;est utile qu&apos;apres une
          modification directe en base.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={rebuildSearchIndexAction}>
            <button type="submit" className="btn btn-secondary">
              <RefreshCw className="size-4" />
              Reconstruire l&apos;index complet
            </button>
          </form>
          <span className="text-xs text-muted-2">
            {formatNumber(indexedCount)} produits indexes — derniere verification le{" "}
            {formatDate(new Date())}
          </span>
        </div>
      </section>
    </div>
  );
}
