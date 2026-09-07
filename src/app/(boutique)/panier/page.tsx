import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCartWithProducts } from "@/lib/queries";
import { CartLine } from "@/components/cart-line";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE, VAT_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon panier" };

export default async function CartPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <EmptyState
        title="Connectez-vous pour voir votre panier"
        text="Vos articles sont conserves d'une session a l'autre une fois connecte."
        actionHref="/connexion?redirectTo=/panier"
        actionLabel="Se connecter"
      />
    );
  }

  const { items, subtotal, count } = await getCartWithProducts(user.id);

  if (!items.length) {
    return (
      <EmptyState
        title="Votre panier est vide"
        text="Parcourez le catalogue et ajoutez vos premiers articles."
        actionHref="/produits"
        actionLabel="Explorer le catalogue"
      />
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));
  const total = subtotal + shipping;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const hasStockIssue = items.some((item) => item.quantity > item.product.stock);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Mon panier <span className="font-normal text-muted-2">({count} article{count > 1 ? "s" : ""})</span>
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="surface-card divide-y divide-border">
          {items.map((item) => (
            <CartLine key={item.id} item={item} />
          ))}
        </div>

        <div className="surface-card sticky top-32 p-5">
          <h2 className="text-sm font-bold">Recapitulatif</h2>

          {remaining > 0 && (
            <div className="mt-3 rounded-lg bg-primary-soft p-3">
              <p className="flex items-start gap-2 text-xs text-primary">
                <Truck className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Plus que <strong>{formatPrice(remaining)}</strong> pour la livraison offerte.
                </span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Sous-total" value={formatPrice(subtotal)} />
            <Row
              label="Livraison"
              value={shipping === 0 ? "Offerte" : formatPrice(shipping)}
              accent={shipping === 0}
            />
            <Row label="dont TVA (20 %)" value={formatPrice(tax)} muted />
            <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>

          {hasStockIssue && (
            <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-xs text-danger">
              Ajustez les quantites signalees avant de valider votre commande.
            </p>
          )}

          <Link
            href="/commande"
            aria-disabled={hasStockIssue}
            className={`btn btn-primary mt-4 w-full py-2.5 ${hasStockIssue ? "pointer-events-none opacity-50" : ""}`}
          >
            Passer commande
            <ArrowRight className="size-4" />
          </Link>

          <Link href="/produits" className="btn btn-ghost mt-2 w-full">
            Continuer mes achats
          </Link>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-2">
            <ShieldCheck className="size-3.5 text-success" />
            Paiement securise, retours gratuits 30 jours
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? "text-xs text-muted-2" : "text-muted"}>{label}</dt>
      <dd
        className={`tabular-nums ${accent ? "font-semibold text-success" : muted ? "text-xs text-muted-2" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
        <ShoppingBag className="size-7" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-2">{text}</p>
      <Link href={actionHref} className="btn btn-primary mt-1">
        {actionLabel}
      </Link>
    </div>
  );
}
