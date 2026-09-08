import { cookies } from "next/headers";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, MapPin, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { LAST_ORDER_COOKIE } from "@/lib/guest-cart";
import { formatDate, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { afficherTelephone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("confirmedTitle"), robots: { index: false, follow: false } };
}

/**
 * Confirmation d'une commande passee sans compte.
 *
 * L'acces tient au cookie depose a la creation, jamais au numero de commande :
 * celui-ci est sequentiel, il suffirait sinon de l'incrementer pour lire la
 * commande d'un autre. Le cookie expire au bout d'une heure.
 */
export default async function GuestOrderConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [t, tCart, tCommon] = await Promise.all([
    getTranslations("orders"),
    getTranslations("cart"),
    getTranslations("common")
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const orderId = (await cookies()).get(LAST_ORDER_COOKIE)?.value;
  if (!orderId) return redirectLocalized("/");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { slug: true } } } } },
  });

  // Une commande rattachee a un compte se consulte depuis l'espace client.
  if (!order || order.userId) return redirectLocalized("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <div className="surface-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{t("confirmedTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("guestConfirmedText")}</p>
        <p className="mt-4 inline-block rounded-lg bg-surface-2 px-4 py-2 font-mono text-sm font-semibold">
          {order.number}
        </p>
        <p className="mt-2 text-xs text-muted-2">{formatDate(order.createdAt, tag)}</p>
      </div>

      <section className="surface-card mt-5 p-5">
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

      <section className="surface-card mt-5 p-5">
        <h2 className="text-sm font-bold">{t("items", { count: order.items.length })}</h2>
        <ul className="mt-3 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3 first:pt-0">
              <div className="relative size-14 shrink-0 rounded-lg bg-surface-2 p-1.5">
                {item.imageSnapshot && (
                  <Image
                    src={item.imageSnapshot}
                    alt={item.titleSnapshot}
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
                {item.product ? (
                  <Link
                    href={`/produits/${item.product.slug}`}
                    className="line-clamp-2 text-sm font-medium hover:text-primary"
                  >
                    {item.titleSnapshot}
                  </Link>
                ) : (
                  <p className="line-clamp-2 text-sm font-medium">{item.titleSnapshot}</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPrice(item.priceSnapshot * item.quantity, tag)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
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
          <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold">
            <dt>{tCart("total")}</dt>
            <dd className="tabular-nums">{formatPrice(order.total, tag)}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-card mt-5 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
        <UserPlus className="size-5 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-muted">{t("createAccountHint")}</p>
        <Link href="/inscription" className="btn btn-secondary shrink-0">
          {t("createAccountCta")}
        </Link>
      </section>

      <Link href="/produits" className="btn btn-primary mt-5 w-full py-3">
        {t("keepShopping")}
      </Link>
    </div>
  );
}
