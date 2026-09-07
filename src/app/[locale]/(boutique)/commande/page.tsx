import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartWithProducts } from "@/lib/queries";
import { CheckoutForm } from "@/components/checkout-form";
import { formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE, VAT_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const user = await getCurrentUser();
  if (!user) return redirectLocalized("/connexion?redirectTo=/commande");

  const [{ locale: rawLocale }, t, tCart, tCommon] = await Promise.all([
    params,
    getTranslations("checkout"),
    getTranslations("cart"),
    getTranslations("common"),
  ]);
  const locale = toLocale(rawLocale);
  const tag = LOCALE_TAGS[locale];

  const { items, subtotal } = await getCartWithProducts(user.id, locale);
  if (!items.length) return redirectLocalized("/panier");

  const defaultAddress = await db.address.findFirst({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = Math.round((subtotal * VAT_RATE) / (1 + VAT_RATE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <Link
        href="/panier"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("backToCart")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("title")}</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_21rem] lg:items-start">
        <CheckoutForm defaultAddress={defaultAddress} userName={user.name} />

        <aside className="surface-card sticky top-32 p-5">
          <h2 className="text-sm font-bold">{t("yourOrder")}</h2>

          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                <div className="relative size-14 shrink-0 rounded-lg bg-surface-2 p-1.5">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.title}
                      width={80}
                      height={80}
                      className="size-full object-contain"
                    />
                  )}
                  <span className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium leading-snug">{item.product.title}</p>
                  <p className="mt-0.5 text-xs text-muted-2">{item.product.brand.name}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold tabular-nums">
                  {formatPrice(item.product.price * item.quantity, tag)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{tCart("subtotal")}</dt>
              <dd className="tabular-nums">{formatPrice(subtotal, tag)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{tCart("shipping")}</dt>
              <dd className={shipping === 0 ? "font-semibold text-success" : "tabular-nums"}>
                {shipping === 0 ? tCommon("free") : formatPrice(shipping, tag)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-xs text-muted-2">
              <dt>{tCart("vat")}</dt>
              <dd className="tabular-nums">{formatPrice(tax, tag)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold">
              <dt>{tCart("total")}</dt>
              <dd className="tabular-nums">{formatPrice(subtotal + shipping, tag)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
