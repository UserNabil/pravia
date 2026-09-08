import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Mail, MapPin, Package, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { updateOrderAction } from "@/app/actions/admin";
import { formatDateTime, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { ORDER_STATUSES } from "@/lib/constants";
import { afficherTelephone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [{ id, locale: rawLocale }, t, tStatus] = await Promise.all([
    params,
    getTranslations("admin.orderDetail"),
    getTranslations("orderStatus"),
  ]);
  // Declare la langue a next-intl. Les segments rendent en parallele : sans
  // cet appel, une page peut lire la langue avant que sa mise en page ne
  // l'ait posee et retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarColor: true } },
      items: { include: { product: { select: { slug: true } } } },
    },
  });

  if (!order) notFound();

  // Une commande peut avoir ete passee sans compte : userId est alors nul.
  const customerOrders = order.userId
    ? await db.order.count({ where: { userId: order.userId } })
    : 0;

  return (
    <div>
      <Link
        href="/admin/commandes"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>

      <div className="mt-3">
        <PageHeader
          title={order.number}
          subtitle={t("placedOn", { date: formatDateTime(order.createdAt, tag) })}
          action={<StatusBadge status={order.status} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="surface-card overflow-hidden">
            <h2 className="border-b border-border px-5 py-3 text-sm font-bold">
              {t("items", { count: order.items.length })}
            </h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
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
                    {item.product ? (
                      <Link
                        href={`/produits/${item.product.slug}`}
                        className="line-clamp-1 text-sm font-medium transition-colors hover:text-primary"
                      >
                        {item.titleSnapshot}
                      </Link>
                    ) : (
                      <p className="line-clamp-1 text-sm font-medium">{item.titleSnapshot}</p>
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

            <dl className="space-y-2 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("subtotal")}</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal, tag)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("shipping")}</dt>
                <dd className="tabular-nums">
                  {order.shipping === 0 ? t("free") : formatPrice(order.shipping, tag)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-xs text-muted-2">
                <dt>{t("vat")}</dt>
                <dd className="tabular-nums">{formatPrice(order.tax, tag)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-2.5 text-base font-bold">
                <dt>{t("total")}</dt>
                <dd className="tabular-nums">{formatPrice(order.total, tag)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">{t("processing")}</h2>

            <form action={updateOrderAction.bind(null, order.id)} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="status" className="label">
                    {t("status")}
                  </label>
                  <select id="status" name="status" defaultValue={order.status} className="input">
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {tStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="trackingNumber" className="label">
                    {t("tracking")}
                  </label>
                  <input
                    id="trackingNumber"
                    name="trackingNumber"
                    defaultValue={order.trackingNumber ?? ""}
                    placeholder={t("trackingPlaceholder")}
                    className="input"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="label">
                  {t("note")}
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={order.notes ?? ""}
                  rows={3}
                  placeholder={t("notePlaceholder")}
                  className="input resize-y"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                {t("save")}
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">{t("customer")}</h2>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: order.user?.avatarColor ?? "#64748b" }}
              >
                {(order.user?.name ?? `${order.shipFirstName} ${order.shipLastName}`)
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {order.user?.name ?? `${order.shipFirstName} ${order.shipLastName}`}
                </p>
                <p className="text-xs text-muted-2">
                  {order.user ? t("customerOrders", { count: customerOrders }) : t("guestOrder")}
                </p>
              </div>
            </div>

            {order.user && (
              <>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted">
                    <Mail className="size-3.5 shrink-0" />
                    <a
                      href={`mailto:${order.user.email}`}
                      className="truncate hover:text-foreground"
                      dir="ltr"
                    >
                      {order.user.email}
                    </a>
                  </li>
                  {order.user.phone && (
                    <li className="flex items-center gap-2 text-muted">
                      <Phone className="size-3.5 shrink-0" />
                      <span dir="ltr">{order.user.phone}</span>
                    </li>
                  )}
                </ul>

                <Link
                  href={`/admin/clients?q=${order.user.email}`}
                  className="btn btn-secondary mt-4 w-full"
                >
                  {t("customerSheet")}
                </Link>
              </>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="size-4 text-muted" />
              {t("shippingAddress")}
            </h2>
            <address className="mt-3 space-y-0.5 text-sm not-italic text-muted">
              <p className="font-medium text-foreground">
                {order.shipFirstName} {order.shipLastName}
              </p>
              <p>{order.shipCommune}</p>
              <p>
                {String(order.shipWilayaCode).padStart(2, "0")} {order.shipWilaya}
              </p>
              {order.shipPhone && (
                <p>
                  <a
                    href={`tel:${order.shipPhone}`}
                    dir="ltr"
                    className="text-primary hover:underline"
                  >
                    {afficherTelephone(order.shipPhone)}
                  </a>
                </p>
              )}
              <p className="pt-1.5 text-xs font-medium text-foreground">
                {order.deliveryMode === "DESK" ? t("deliveryDesk") : t("deliveryHome")}
              </p>
            </address>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Package className="size-4 text-muted" />
              {t("dispatch")}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("payment")}</dt>
                {/* Un seul mode accepte : especes a la livraison. */}
                <dd className="font-medium">Especes a la livraison</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("trackingShort")}</dt>
                <dd className="truncate font-medium">{order.trackingNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("updatedAt")}</dt>
                <dd className="text-xs text-muted-2">{formatDateTime(order.updatedAt, tag)}</dd>
              </div>
            </dl>
            {order.notes && (
              <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                {order.notes}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
