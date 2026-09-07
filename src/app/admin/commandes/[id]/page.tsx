import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MapPin, Package, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { updateOrderAction } from "@/app/actions/admin";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarColor: true } },
      items: { include: { product: { select: { slug: true } } } },
    },
  });

  if (!order) notFound();

  const customerOrders = await db.order.count({ where: { userId: order.userId } });

  return (
    <div>
      <Link
        href="/admin/commandes"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour aux commandes
      </Link>

      <div className="mt-3">
        <PageHeader
          title={order.number}
          subtitle={`Passee le ${formatDateTime(order.createdAt)}`}
          action={<StatusBadge status={order.status} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="surface-card overflow-hidden">
            <h2 className="border-b border-border px-5 py-3 text-sm font-bold">
              Articles ({order.items.length})
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
                    <p className="mt-0.5 text-xs text-muted-2">
                      {formatPrice(item.priceSnapshot)} x {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatPrice(item.priceSnapshot * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Sous-total</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Livraison</dt>
                <dd className="tabular-nums">
                  {order.shipping === 0 ? "Offerte" : formatPrice(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between text-xs text-muted-2">
                <dt>dont TVA</dt>
                <dd className="tabular-nums">{formatPrice(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">Traitement de la commande</h2>

            <form action={updateOrderAction.bind(null, order.id)} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="status" className="label">
                    Statut
                  </label>
                  <select id="status" name="status" defaultValue={order.status} className="input">
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="trackingNumber" className="label">
                    Numero de suivi
                  </label>
                  <input
                    id="trackingNumber"
                    name="trackingNumber"
                    defaultValue={order.trackingNumber ?? ""}
                    placeholder="PRV123456789FR"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="label">
                  Note interne
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={order.notes ?? ""}
                  rows={3}
                  placeholder="Visible uniquement par l'equipe."
                  className="input resize-y"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface-card p-5">
            <h2 className="text-sm font-bold">Client</h2>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: order.user.avatarColor }}
              >
                {order.user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{order.user.name}</p>
                <p className="text-xs text-muted-2">
                  {customerOrders} commande{customerOrders > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted">
                <Mail className="size-3.5 shrink-0" />
                <a href={`mailto:${order.user.email}`} className="truncate hover:text-foreground">
                  {order.user.email}
                </a>
              </li>
              {(order.shipPhone || order.user.phone) && (
                <li className="flex items-center gap-2 text-muted">
                  <Phone className="size-3.5 shrink-0" />
                  {order.shipPhone ?? order.user.phone}
                </li>
              )}
            </ul>

            <Link href={`/admin/clients?q=${order.user.email}`} className="btn btn-secondary mt-4 w-full">
              Voir la fiche client
            </Link>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="size-4 text-muted" />
              Adresse de livraison
            </h2>
            <address className="mt-3 space-y-0.5 text-sm not-italic text-muted">
              <p className="font-medium text-foreground">{order.shipFullName}</p>
              <p>{order.shipLine1}</p>
              {order.shipLine2 && <p>{order.shipLine2}</p>}
              <p>
                {order.shipZip} {order.shipCity}
              </p>
              <p>{order.shipCountry}</p>
            </address>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Package className="size-4 text-muted" />
              Expedition
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Paiement</dt>
                <dd className="font-medium">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Suivi</dt>
                <dd className="truncate font-medium">{order.trackingNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Mise a jour</dt>
                <dd className="text-xs text-muted-2">{formatDateTime(order.updatedAt)}</dd>
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
