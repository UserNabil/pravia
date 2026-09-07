import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartWithProducts } from "@/lib/queries";
import { CheckoutForm } from "@/components/checkout-form";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE, VAT_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commande",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?redirectTo=/commande");

  const { items, subtotal } = await getCartWithProducts(user.id);
  if (!items.length) redirect("/panier");

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
        <ChevronLeft className="size-4" />
        Retour au panier
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Finaliser la commande</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_21rem] lg:items-start">
        <CheckoutForm defaultAddress={defaultAddress} userName={user.name} />

        <aside className="surface-card sticky top-32 p-5">
          <h2 className="text-sm font-bold">Votre commande</h2>

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
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium leading-snug">{item.product.title}</p>
                  <p className="mt-0.5 text-xs text-muted-2">{item.product.brand.name}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold tabular-nums">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Sous-total</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Livraison</dt>
              <dd className={shipping === 0 ? "font-semibold text-success" : "tabular-nums"}>
                {shipping === 0 ? "Offerte" : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-muted-2">
              <dt>dont TVA (20 %)</dt>
              <dd className="tabular-nums">{formatPrice(tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(subtotal + shipping)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
