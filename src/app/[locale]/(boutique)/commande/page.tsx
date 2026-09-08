import { Link } from "@/i18n/navigation";
import { redirectLocalized } from "@/lib/redirect";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentCart } from "@/lib/current-cart";
import { listWilayas } from "@/lib/shipping";
import { CheckoutForm } from "@/components/checkout-form";
import { toLocale } from "@/i18n/routing";
import { FREE_SHIPPING_THRESHOLD, VAT_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const t = await getTranslations("checkout");
  const locale = toLocale(rawLocale);

  // Aucune redirection vers la connexion : commander ne demande pas de compte.
  const [{ items, subtotal }, wilayas, user] = await Promise.all([
    getCurrentCart(locale),
    listWilayas(),
    getCurrentUser(),
  ]);

  if (!items.length) return redirectLocalized("/panier");

  // Un client connecte retrouve son nom prerempli ; le reste du formulaire est
  // identique pour tout le monde.
  const [prenom = "", ...reste] = (user?.name ?? "").trim().split(/\s+/);

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

      <div className="mt-5">
        <CheckoutForm
          items={items}
          subtotal={subtotal}
          wilayas={wilayas}
          freeThreshold={FREE_SHIPPING_THRESHOLD}
          vatRate={VAT_RATE}
          defaultFirstName={user ? prenom : ""}
          defaultLastName={user ? reste.join(" ") : ""}
        />
      </div>
    </div>
  );
}
