import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Package } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mes commandes" };

export default async function AccountOrdersPage() {
  const user = await requireUser();

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Mes commandes</h1>
      <p className="mt-1 text-sm text-muted-2">
        {orders.length} commande{orders.length > 1 ? "s" : ""} passee{orders.length > 1 ? "s" : ""}
      </p>

      {orders.length === 0 ? (
        <div className="surface-card mt-5 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
            <Package className="size-6" />
          </span>
          <p className="text-base font-semibold">Aucune commande</p>
          <p className="max-w-sm text-sm text-muted-2">
            Une fois votre premiere commande passee, vous pourrez suivre sa livraison depuis cette page.
          </p>
          <Link href="/produits" className="btn btn-primary mt-1">
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{order.number}</p>
                  <p className="mt-0.5 text-xs text-muted-2">{formatDateTime(order.createdAt)}</p>
                </div>
                <span className={`chip ring-1 ring-inset ${ORDER_STATUS_STYLES[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-2">Total</p>
                  <p className="font-bold tabular-nums">{formatPrice(order.total)}</p>
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-2">
                  {order.trackingNumber ? (
                    <>
                      Suivi : <span className="font-medium text-foreground">{order.trackingNumber}</span>
                    </>
                  ) : (
                    "Numero de suivi communique a l'expedition."
                  )}
                </p>
                <Link
                  href={`/compte/commandes/${order.id}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Voir le detail
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
