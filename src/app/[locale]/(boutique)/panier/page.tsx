import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { getCurrentCart } from "@/lib/current-cart";
import { cheapestShippingFee } from "@/lib/shipping";
import { CartLine } from "@/components/cart-line";
import { formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { FREE_SHIPPING_THRESHOLD, VAT_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [t, tCommon] = await Promise.all([
    getTranslations("cart"),
    getTranslations("common")
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  // Aucune connexion exigee : le panier d'un visiteur sans compte vit dans un
  // cookie, et se retrouve tel quel jusqu'au paiement.
  const { items, subtotal, count } = await getCurrentCart(toLocale(rawLocale));

  if (!items.length) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        text={t("emptyText")}
        actionHref="/produits"
        actionLabel={t("emptyCta")}
      />
    );
  }

  // Le tarif exact depend de la wilaya, choisie a l'etape suivante : le panier
  // annonce donc le tarif le plus bas de la grille, a titre indicatif.
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : await cheapestShippingFee();
  const tax = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));
  const total = subtotal + shipping;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const hasStockIssue = items.some((item) => item.quantity > item.product.stock);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("title")}{" "}
        <span className="font-normal text-muted-2">({t("itemCount", { count })})</span>
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="surface-card divide-y divide-border">
          {items.map((item) => (
            <CartLine key={item.id} item={item} />
          ))}
        </div>

        <div className="surface-card sticky top-32 p-5">
          <h2 className="text-sm font-bold">{t("summary")}</h2>

          {remaining > 0 && (
            <div className="mt-3 rounded-lg bg-primary-soft p-3">
              <p className="flex items-start gap-2 text-xs text-primary">
                <Truck className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {t.rich("freeShippingProgress", {
                    amount: formatPrice(remaining, tag),
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
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
            <Row label={t("subtotal")} value={formatPrice(subtotal, tag)} />
            <Row
              label={t("shipping")}
              value={shipping === 0 ? tCommon("free") : formatPrice(shipping, tag)}
              accent={shipping === 0}
            />
            <Row label={t("vat")} value={formatPrice(tax, tag)} muted />
            <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-bold">
              <dt>{t("total")}</dt>
              <dd className="tabular-nums">{formatPrice(total, tag)}</dd>
            </div>
          </dl>

          {hasStockIssue && (
            <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-xs text-danger">
              {t("stockIssue")}
            </p>
          )}

          <Link
            href="/commande"
            aria-disabled={hasStockIssue}
            className={`btn btn-primary mt-4 w-full py-2.5 ${hasStockIssue ? "pointer-events-none opacity-50" : ""}`}
          >
            {t("checkout")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>

          <Link href="/produits" className="btn btn-ghost mt-2 w-full">
            {t("continueShopping")}
          </Link>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            {t("securePayment")}
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
    <div className="flex items-baseline justify-between gap-3">
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
