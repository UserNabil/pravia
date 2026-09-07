import Link from "next/link";
import { Euro, Package, Percent, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatCard, TableShell, Td, Th } from "@/components/admin/ui";
import { BarList, RevenueChart, type ChartPoint } from "@/components/admin/revenue-chart";
import { getSalesBreakdown, getTopProducts } from "@/lib/analytics";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Statistiques" };

const PAID_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

const RANGES = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "365", label: "12 mois" },
] as const;

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const sp = await searchParams;
  const days = Number(sp.periode ?? 30) || 30;
  const since = new Date(Date.now() - days * 86_400_000);

  const [orders, statusBreakdown, breakdown, topProducts, newCustomers] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: since } },
      select: { total: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { status: true },
      _sum: { total: true },
    }),
    getSalesBreakdown(since),
    getTopProducts(10, since),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
  ]);

  const paid = orders.filter((order) => PAID_STATUSES.includes(order.status));
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  const cancelled = orders.filter((order) => order.status === "CANCELLED").length;
  const cancellationRate = orders.length ? (cancelled / orders.length) * 100 : 0;
  const averageBasket = paid.length ? Math.round(revenue / paid.length) : 0;

  // Regroupement par jour, ou par semaine au-dela de 90 jours pour rester lisible.
  const bucketDays = days > 90 ? 7 : 1;
  const bucketCount = Math.ceil(days / bucketDays);
  const buckets = new Map<number, number>();
  for (let i = 0; i < bucketCount; i++) buckets.set(i, 0);

  for (const order of paid) {
    const elapsed = Math.floor((order.createdAt.getTime() - since.getTime()) / 86_400_000);
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(elapsed / bucketDays)));
    buckets.set(index, (buckets.get(index) ?? 0) + order.total);
  }

  const chartPoints: ChartPoint[] = [...buckets.entries()].map(([index, value]) => {
    const date = new Date(since.getTime() + index * bucketDays * 86_400_000);
    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      fullLabel: formatDate(date),
      value,
    };
  });

  const brandRevenue = breakdown.byBrand;

  return (
    <div>
      <PageHeader
        title="Statistiques"
        subtitle={`Analyse sur les ${days} derniers jours`}
        action={
          <div className="flex gap-1.5">
            {RANGES.map((range) => (
              <Link
                key={range.value}
                href={`/admin/statistiques?periode=${range.value}`}
                className={`chip border transition-colors ${
                  String(days) === range.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {range.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={formatPrice(revenue)} Icon={Euro} />
        <StatCard
          label="Commandes payees"
          value={formatNumber(paid.length)}
          hint={`${formatNumber(orders.length)} au total`}
          Icon={ShoppingCart}
        />
        <StatCard label="Panier moyen" value={formatPrice(averageBasket)} Icon={Package} />
        <StatCard
          label="Taux d'annulation"
          value={`${cancellationRate.toFixed(1)} %`}
          hint={`${formatNumber(newCustomers)} nouveaux clients`}
          Icon={Percent}
        />
      </div>

      <section className="surface-card mt-5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">Evolution du chiffre d&apos;affaires</h2>
          <p className="text-xs text-muted-2">
            Agregation {bucketDays === 1 ? "journaliere" : "hebdomadaire"}
          </p>
        </div>
        <div className="mt-3">
          <RevenueChart points={chartPoints} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Chiffre d&apos;affaires par marque</h2>
          <p className="mt-1 text-xs text-muted-2">Sur la periode selectionnee</p>
          <div className="mt-4">
            {brandRevenue.length ? (
              <BarList rows={brandRevenue} formatValue={formatPrice} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-2">Aucune vente enregistree.</p>
            )}
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">Repartition des statuts</h2>
          <p className="mt-1 text-xs text-muted-2">Sur la periode selectionnee</p>
          <ul className="mt-4 space-y-3">
            {statusBreakdown.map((row) => (
              <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{ORDER_STATUS_LABELS[row.status] ?? row.status}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-muted-2">{row._count.status}</span>
                  <span className="w-20 text-right font-semibold tabular-nums">
                    {formatPrice(row._sum.total ?? 0)}
                  </span>
                </span>
              </li>
            ))}
            {statusBreakdown.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-2">
                Aucune commande sur cette periode.
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-bold">Top 10 des produits</h2>
        <TableShell>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Produit</Th>
              <Th>Categorie</Th>
              <Th>Marque</Th>
              <Th className="text-right">Vendus</Th>
              <Th className="text-right">CA genere</Th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((product, index) => (
              <tr key={product.id} className="transition-colors hover:bg-surface-2">
                <Td className="tabular-nums text-muted-2">{index + 1}</Td>
                <Td>
                  <Link
                    href={`/admin/produits/${product.id}`}
                    className="font-medium transition-colors hover:text-primary"
                  >
                    {product.title}
                  </Link>
                </Td>
                <Td className="text-xs text-muted">{product.category}</Td>
                <Td className="text-xs text-muted">{product.brand}</Td>
                <Td className="text-right tabular-nums">{formatNumber(product.units)}</Td>
                <Td className="text-right font-semibold tabular-nums">
                  {formatPrice(product.revenue)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}
