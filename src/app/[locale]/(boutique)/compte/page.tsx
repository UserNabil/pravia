import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Heart, Package, ShoppingBag, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { ORDER_STATUS_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("myAccount"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, t, tOrders, tStatus, tCommon, tCatalogue, user] = await Promise.all([
    params,
    getTranslations("customerAccount"),
    getTranslations("orders"),
    getTranslations("orderStatus"),
    getTranslations("common"),
    getTranslations("catalogue"),
    requireUser(),
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const [orders, wishlistCount, cartCount, recentOrders] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, select: { total: true, status: true } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.cartItem.aggregate({ where: { userId: user.id }, _sum: { quantity: true } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { items: { take: 4 }, _count: { select: { items: true } } },
    }),
  ]);

  const spent = orders
    .filter((order) => ["PAID", "SHIPPED", "DELIVERED"].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("greeting", { name: user.name.split(" ")[0] })}
        </h1>
        <p className="mt-1 text-sm text-muted-2">{t("intro")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          Icon={Package}
          label={t("orders")}
          value={formatNumber(orders.length, tag)}
          href="/compte/commandes"
        />
        <Tile
          Icon={Wallet}
          label={t("totalSpent")}
          value={formatPrice(spent, tag)}
          href="/compte/commandes"
        />
        <Tile
          Icon={Heart}
          label={t("favourites")}
          value={formatNumber(wishlistCount, tag)}
          href="/favoris"
        />
        <Tile
          Icon={ShoppingBag}
          label={t("cart")}
          value={formatNumber(cartCount._sum.quantity ?? 0, tag)}
          href="/panier"
        />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight">{t("recentOrders")}</h2>
          <Link href="/compte/commandes" className="text-sm font-medium text-primary hover:underline">
            {tCommon("seeAll")}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
              <Package className="size-6" />
            </span>
            <p className="text-sm font-medium">{t("noOrdersTitle")}</p>
            <p className="max-w-xs text-sm text-muted-2">{t("noOrdersText")}</p>
            <Link href="/produits" className="btn btn-primary mt-1">
              {tCatalogue("emptyCta")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/compte/commandes/${order.id}`}
                className="surface-card flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="size-11 shrink-0 rounded-lg border border-border bg-surface-2 p-1"
                    >
                      {item.imageSnapshot && (
                        <Image
                          src={item.imageSnapshot}
                          alt=""
                          width={48}
                          height={48}
                          className="size-full object-contain"
                        />
                      )}
                    </span>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{order.number}</p>
                  <p className="mt-0.5 text-xs text-muted-2">
                    {t("orderLine", {
                      date: formatDate(order.createdAt, tag),
                      count: order._count.items,
                    })}
                  </p>
                </div>

                <span className={`chip ring-1 ring-inset ${ORDER_STATUS_STYLES[order.status]}`}>
                  {tStatus(order.status)}
                </span>

                <p className="font-bold tabular-nums">{formatPrice(order.total, tag)}</p>
                <ArrowRight className="size-4 shrink-0 text-muted-2 rtl:rotate-180" />
                <span className="sr-only">{tOrders("viewDetail")}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  Icon,
  label,
  value,
  href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href} className="surface-card p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-2">{label}</p>
          <p className="mt-1.5 truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-[18px]" />
        </span>
      </div>
    </Link>
  );
}
