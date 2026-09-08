import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Package } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { ORDER_STATUS_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [t, tStatus, tCart, user] = await Promise.all([
    getTranslations("orders"),
    getTranslations("orderStatus"),
    getTranslations("cart"),
    requireUser()
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-2">{t("count", { count: orders.length })}</p>

      {orders.length === 0 ? (
        <div className="surface-card mt-5 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
            <Package className="size-6" />
          </span>
          <p className="text-base font-semibold">{t("emptyTitle")}</p>
          <p className="max-w-sm text-sm text-muted-2">{t("emptyText")}</p>
          <Link href="/produits" className="btn btn-primary mt-1">
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{order.number}</p>
                  <p className="mt-0.5 text-xs text-muted-2">
                    {formatDateTime(order.createdAt, tag)}
                  </p>
                </div>
                <span className={`chip ring-1 ring-inset ${ORDER_STATUS_STYLES[order.status]}`}>
                  {tStatus(order.status)}
                </span>
                <div className="ms-auto text-end">
                  <p className="text-xs text-muted-2">{tCart("total")}</p>
                  <p className="font-bold tabular-nums">{formatPrice(order.total, tag)}</p>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3.5 px-4 py-3">
                    <span className="size-12 shrink-0 rounded-lg bg-surface-2 p-1.5">
                      {item.imageSnapshot && (
                        <Image
                          src={item.imageSnapshot}
                          alt=""
                          width={56}
                          height={56}
                          className="size-full object-contain"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.titleSnapshot}</p>
                      <p className="mt-0.5 text-xs text-muted-2" dir="ltr">
                        {formatPrice(item.priceSnapshot, tag)} × {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatPrice(item.priceSnapshot * item.quantity, tag)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-2">
                  {order.trackingNumber
                    ? t.rich("tracking", {
                        number: order.trackingNumber,
                        strong: (chunks) => (
                          <span className="font-medium text-foreground">{chunks}</span>
                        ),
                      })
                    : t("trackingPending")}
                </p>
                <Link
                  href={`/compte/commandes/${order.id}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t("viewDetail")}
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
