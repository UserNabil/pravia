import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Euro, Package, Percent, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatCard, TableShell, Td, Th } from "@/components/admin/ui";
import { BarList, RevenueChart, type ChartPoint } from "@/components/admin/revenue-chart";
import { getSalesBreakdown, getTopProducts } from "@/lib/analytics";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.stats");
  return { title: t("title") };
}

const PAID_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

const RANGES = [
  { value: "30", key: "range30" },
  { value: "90", key: "range90" },
  { value: "365", key: "range365" },
] as const;

export default async function AdminStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const [{ locale: rawLocale }, sp, t, tStatus] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin.stats"),
    getTranslations("orderStatus"),
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
  const knownStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
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
      fullLabel: formatDate(date, tag),
      value,
    };
  });

  const brandRevenue = breakdown.byBrand;

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { days })}
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
                {t(range.key)}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("revenue")} value={formatPrice(revenue, tag)} Icon={Euro} />
        <StatCard
          label={t("paidOrders")}
          value={formatNumber(paid.length, tag)}
          hint={t("totalOrders", { count: formatNumber(orders.length, tag) })}
          Icon={ShoppingCart}
        />
        <StatCard label={t("averageBasket")} value={formatPrice(averageBasket, tag)} Icon={Package} />
        <StatCard
          label={t("cancellationRate")}
          value={`${cancellationRate.toFixed(1)} %`}
          hint={t("newCustomers", { count: newCustomers })}
          Icon={Percent}
        />
      </div>

      <section className="surface-card mt-5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">{t("revenueTrend")}</h2>
          <p className="text-xs text-muted-2">
            {bucketDays === 1 ? t("aggregationDaily") : t("aggregationWeekly")}
          </p>
        </div>
        <div className="mt-3">
          <RevenueChart points={chartPoints} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("revenueByBrand")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("overPeriod")}</p>
          <div className="mt-4">
            {brandRevenue.length ? (
              <BarList rows={brandRevenue} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-2">{t("noSales")}</p>
            )}
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("statusBreakdown")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("overPeriod")}</p>
          <ul className="mt-4 space-y-3">
            {statusBreakdown.map((row) => (
              <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  {knownStatuses.includes(row.status) ? tStatus(row.status) : row.status}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-muted-2">{row._count.status}</span>
                  <span className="w-20 text-end font-semibold tabular-nums">
                    {formatPrice(row._sum.total ?? 0, tag)}
                  </span>
                </span>
              </li>
            ))}
            {statusBreakdown.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-2">
                {t("noOrders")}
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-bold">{t("topProducts")}</h2>
        <TableShell>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>{t("colProduct")}</Th>
              <Th>{t("colCategory")}</Th>
              <Th>{t("colBrand")}</Th>
              <Th className="text-end">{t("colUnits")}</Th>
              <Th className="text-end">{t("colRevenue")}</Th>
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
                <Td className="text-end tabular-nums">{formatNumber(product.units, tag)}</Td>
                <Td className="text-end font-semibold tabular-nums">
                  {formatPrice(product.revenue, tag)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}
