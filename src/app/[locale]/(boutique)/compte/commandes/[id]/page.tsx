import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, ChevronLeft, MapPin, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { ORDER_STATUSES, ORDER_STATUS_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("viewDetail"), robots: { index: false, follow: false } };
}

/** Etapes affichees dans le suivi ; les statuts hors parcours sont traites a part. */
const TIMELINE = ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const;

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ nouvelle?: string }>;
}) {
  const [{ id, locale: rawLocale }, { nouvelle }, t, tStatus, tCart, tCommon, user] =
    await Promise.all([
      params,
      searchParams,
      getTranslations("orders"),
      getTranslations("orderStatus"),
      getTranslations("cart"),
      getTranslations("common"),
      requireUser(),
    ]);
  // Declare la langue a next-intl. Les segments rendent en parallele : sans
  // cet appel, une page peut lire la langue avant que sa mise en page ne
  // l'ait posee et retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { slug: true } } } } },
  });

  // Une commande n'est visible que par son proprietaire.
  if (!order || order.userId !== user.id) notFound();

  const currentStep = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);
  const isCancelled = ["CANCELLED", "REFUNDED"].includes(order.status);

  return (
    <div>
      <Link
        href="/compte/commandes"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("title")}
      </Link>

      {nouvelle === "1" && (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">{t("confirmedTitle")}</p>
            <p className="mt-0.5 text-sm text-muted">{t("confirmedText")}</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{order.number}</h1>
          <p className="mt-1 text-sm text-muted-2">
            {t("placedOn", { date: formatDateTime(order.createdAt, tag) })}
          </p>
        </div>
        <span className={`chip ring-1 ring-inset ${ORDER_STATUS_STYLES[order.status]}`}>
          {tStatus(order.status)}
        </span>
      </div>

      {!isCancelled && (
        <section className="surface-card mt-5 p-5">
          <h2 className="text-sm font-bold">{t("trackingTitle")}</h2>
          <ol className="mt-5 flex">
            {TIMELINE.map((step, index) => {
              const done = index <= currentStep;
              return (
                <li key={step} className="relative flex-1 last:flex-none">
                  <div className="flex items-center">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        done ? "bg-primary text-primary-foreground" : "bg-surface-3 text-muted-2"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < TIMELINE.length - 1 && (
                      <span
                        className={`h-0.5 flex-1 transition-colors ${
                          index < currentStep ? "bg-primary" : "bg-surface-3"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs ${done ? "font-medium text-foreground" : "text-muted-2"}`}
                  >
                    {tStatus(step)}
                  </p>
                </li>
              );
            })}
          </ol>

          {order.trackingNumber && (
            <p className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3 text-sm">
              <Truck className="size-4 shrink-0 text-primary" />
              {t("trackingNumber")}{" "}
              <span className="font-semibold tabular-nums">{order.trackingNumber}</span>
            </p>
          )}
        </section>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <section className="surface-card overflow-hidden">
          <h2 className="border-b border-border px-5 py-3 text-sm font-bold">
            {t("items", { count: order.items.length })}
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="size-14 shrink-0 rounded-lg bg-surface-2 p-1.5">
                  {item.imageSnapshot && (
                    <Image
                      src={item.imageSnapshot}
                      alt=""
                      width={64}
                      height={64}
                      className="size-full object-contain"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {item.product ? (
                    <Link
                      href={`/produits/${item.product.slug}`}
                      className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary"
                    >
                      {item.titleSnapshot}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-medium">{item.titleSnapshot}</p>
                  )}
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
        </section>

        <div className="space-y-5">
          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">{t("summary")}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{tCart("subtotal")}</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal, tag)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{tCart("shipping")}</dt>
                <dd className={order.shipping === 0 ? "font-semibold text-success" : "tabular-nums"}>
                  {order.shipping === 0 ? tCommon("free") : formatPrice(order.shipping, tag)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-xs text-muted-2">
                <dt>{tCart("vat")}</dt>
                <dd className="tabular-nums">{formatPrice(order.tax, tag)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-2.5 text-base font-bold">
                <dt>{tCart("total")}</dt>
                <dd className="tabular-nums">{formatPrice(order.total, tag)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-2">{t("paidCash")}</p>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="size-4 text-muted" />
              {t("delivery")}
            </h2>
            <address className="mt-3 space-y-0.5 text-sm not-italic text-muted">
              <p className="font-medium text-foreground">
                {order.shipFirstName} {order.shipLastName}
              </p>
              <p>{order.shipCommune}</p>
              <p>
                {String(order.shipWilayaCode).padStart(2, "0")} {order.shipWilaya}
              </p>
            </address>
          </section>

          {ORDER_STATUSES.includes(order.status as (typeof ORDER_STATUSES)[number]) &&
            order.status === "DELIVERED" && (
              <Link href="/produits" className="btn btn-secondary w-full">
                {t("orderAgain")}
              </Link>
            )}
        </div>
      </div>
    </div>
  );
}
