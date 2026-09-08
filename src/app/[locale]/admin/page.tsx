import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AlertTriangle,
  Euro,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { StatCard, StatusBadge, TableShell, Td, Th } from "@/components/admin/ui";
import { BarList, RevenueChart, type ChartPoint } from "@/components/admin/revenue-chart";
import { getSalesBreakdown, getTopProducts } from "@/lib/analytics";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const PAID_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const t = await getTranslations("admin.dashboard");
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 86_400_000);
  const start60 = new Date(now.getTime() - 60 * 86_400_000);

  const [
    ordersLast30,
    ordersPrevious30,
    totals,
    customerCount,
    productCount,
    lowStock,
    recentOrders,
    topProducts,
    breakdown,
    pendingReviews,
  ] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start30 }, status: { in: PAID_STATUSES } },
      select: { total: true, createdAt: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: start60, lt: start30 }, status: { in: PAID_STATUSES } },
      select: { total: true },
    }),
    db.order.aggregate({
      where: { status: { in: PAID_STATUSES } },
      _sum: { total: true },
      _count: true,
    }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count({ where: { active: true } }),
    db.product.findMany({
      where: { active: true, stock: { lte: 15 } },
      orderBy: { stock: "asc" },
      take: 6,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, avatarColor: true } },
        _count: { select: { items: true } },
      },
    }),
    getTopProducts(5),
    getSalesBreakdown(),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  const revenue30 = ordersLast30.reduce((sum, order) => sum + order.total, 0);
  const revenuePrevious = ordersPrevious30.reduce((sum, order) => sum + order.total, 0);
  const revenueTrend = revenuePrevious
    ? ((revenue30 - revenuePrevious) / revenuePrevious) * 100
    : 0;

  const orderTrend = ordersPrevious30.length
    ? ((ordersLast30.length - ordersPrevious30.length) / ordersPrevious30.length) * 100
    : 0;

  const averageBasket = ordersLast30.length ? Math.round(revenue30 / ordersLast30.length) : 0;

  // Serie journaliere sur 30 jours, jours sans vente inclus.
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }
  for (const order of ordersLast30) {
    const key = order.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + order.total);
  }

  const chartPoints: ChartPoint[] = [...buckets.entries()].map(([key, value]) => {
    const date = new Date(key);
    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      fullLabel: formatDate(date, tag),
      value,
    };
  });

  const categoryRows = breakdown.byCategory;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("revenue30")}
          value={formatPrice(revenue30, tag)}
          trend={revenueTrend}
          hint={t("vsPrevious")}
          Icon={Euro}
        />
        <StatCard
          label={t("orders30")}
          value={formatNumber(ordersLast30.length, tag)}
          trend={orderTrend}
          hint={t("vsPrevious")}
          Icon={ShoppingCart}
        />
        <StatCard
          label={t("averageBasket")}
          value={formatPrice(averageBasket, tag)}
          hint={t("totalOrders", { count: totals._count })}
          Icon={TrendingUp}
        />
        <StatCard
          label={t("customers")}
          value={formatNumber(customerCount, tag)}
          hint={t("productsOnline", { count: productCount })}
          Icon={Users}
        />
      </div>

      {(lowStock.length > 0 || pendingReviews > 0) && (
        <div className="flex flex-wrap gap-3">
          {lowStock.length > 0 && (
            <Link
              href="/admin/produits?stock=faible"
              className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning transition-colors hover:bg-warning/15"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {t("lowStockAlert", { count: lowStock.length })}
            </Link>
          )}
          {pendingReviews > 0 && (
            <Link
              href="/admin/avis?statut=PENDING"
              className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-sm text-primary transition-colors hover:bg-primary/15"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {t("pendingReviewsAlert", { count: pendingReviews })}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="surface-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold">{t("revenue")}</h2>
            <p className="text-xs text-muted-2">{t("last30Days")}</p>
          </div>
          <div className="mt-3">
            <RevenueChart points={chartPoints} />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("salesByCategory")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("sinceOpening")}</p>
          <div className="mt-4">
            {categoryRows.length ? (
              <BarList rows={categoryRows} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-2">{t("noSales")}</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold">{t("recentOrders")}</h2>
            <Link href="/admin/commandes" className="text-xs font-medium text-primary hover:underline">
              {t("seeAll")}
            </Link>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>{t("colOrder")}</Th>
                <Th>{t("colCustomer")}</Th>
                <Th>{t("colDate")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th className="text-end">{t("colTotal")}</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.number}
                    </Link>
                    <span className="ms-1.5 text-xs text-muted-2">
                      ({t("itemCount", { count: order._count.items })})
                    </span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
                        style={{ backgroundColor: order.user?.avatarColor ?? "#64748b" }}
                      >
                        {(order.user?.name ?? order.shipFirstName).slice(0, 1)}
                      </span>
                      <span className="truncate text-xs">
                        {order.user?.name ?? `${order.shipFirstName} ${order.shipLastName}`}
                      </span>
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted-2">
                    {formatDate(order.createdAt, tag)}
                  </Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                  <Td className="text-end font-semibold tabular-nums">
                    {formatPrice(order.total, tag)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </section>

        <div className="space-y-4">
          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">{t("bestSellers")}</h2>
            <p className="mt-1 text-xs text-muted-2">{t("revenueGenerated")}</p>
            <ul className="mt-3 space-y-3">
              {topProducts.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-2">{t("noSales")}</li>
              )}
              {topProducts.map((product, index) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-xs font-bold tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <Link
                    href={`/admin/produits/${product.id}`}
                    className="min-w-0 flex-1 truncate text-sm transition-colors hover:text-primary"
                  >
                    {product.title}
                    <span className="ms-1.5 text-xs text-muted-2">x{product.units}</span>
                  </Link>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                    {formatPrice(product.revenue, tag)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">{t("lowStock")}</h2>
              <Link href="/admin/produits" className="text-xs font-medium text-primary hover:underline">
                {t("manage")}
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {lowStock.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-2">{t("stockHealthy")}</li>
              )}
              {lowStock.map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="size-9 shrink-0 rounded-lg bg-surface-2 p-1">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-contain"
                      />
                    )}
                  </span>
                  <Link
                    href={`/admin/produits/${product.id}`}
                    className="min-w-0 flex-1 truncate text-sm transition-colors hover:text-primary"
                  >
                    {product.title}
                  </Link>
                  <span
                    className={`chip shrink-0 ${
                      product.stock === 0 ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                    }`}
                  >
                    {product.stock}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link href="/admin/produits/nouveau" className="btn btn-primary w-full py-2.5">
            <Package className="size-4" />
            {t("addProduct")}
          </Link>
        </div>
      </div>
    </div>
  );
}
