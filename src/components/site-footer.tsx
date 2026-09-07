import { getTranslations } from "next-intl/server";
import { CreditCard, Headphones, RotateCcw, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslatedCategories } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { LogoLockup } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const [t, tNav, tAccount, tTheme] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("account"),
    getTranslations("theme"),
  ]);

  const categories = (await getTranslatedCategories(locale)).slice(0, 6);

  const guarantees = [
    { Icon: Truck, title: t("guarantee1"), text: t("guarantee1Text") },
    { Icon: RotateCcw, title: t("guarantee2"), text: t("guarantee2Text") },
    { Icon: CreditCard, title: t("guarantee3"), text: t("guarantee3Text") },
    { Icon: Headphones, title: t("guarantee4"), text: t("guarantee4Text") },
  ];

  const columns = [
    {
      title: t("buy"),
      links: [
        { href: "/produits", label: tNav("allCatalogue") },
        { href: "/produits?tri=best-sellers", label: tNav("bestSellers") },
        { href: "/produits?tri=newest", label: tNav("newArrivals") },
        { href: "/produits?condition=REFURBISHED", label: t("refurbished") },
        { href: "/produits?assurance=1", label: tNav("tradeAssurance") },
      ],
    },
    {
      title: t("myAccount"),
      links: [
        { href: "/compte", label: tAccount("dashboard") },
        { href: "/compte/commandes", label: tAccount("myOrders") },
        { href: "/favoris", label: tAccount("myFavourites") },
        { href: "/compte/adresses", label: tAccount("myAddresses") },
        { href: "/panier", label: tAccount("myCart") },
      ],
    },
    {
      title: t("help"),
      links: [
        { href: "/aide", label: t("helpCentre") },
        { href: "/aide#livraison", label: t("shippingTracking") },
        { href: "/aide#retours", label: t("returnsRefunds") },
        { href: "/aide#garantie", label: t("warranties") },
        { href: "/aide#vendeurs", label: t("becomeSeller") },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-6">
        <div className="grid gap-6 border-b border-border pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {guarantees.map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-2">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {/* Le pied de page a la place d'afficher le verrou complet, baselines comprises. */}
            <LogoLockup className="h-12" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{t("tagline")}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <span className="text-xs text-muted-2">{tTheme("hint")}</span>
              <LanguageSwitcher />
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title}>
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-6 items-center text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border py-6">
          <span className="text-xs font-medium text-muted-2">{t("categories")}</span>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/produits?categorie=${category.slug}`}
              className="inline-flex min-h-6 items-center text-xs text-muted transition-colors hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p className="flex gap-4">
            <Link href="/aide" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">
              {t("terms")}
            </Link>
            <Link href="/aide" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">
              {t("privacy")}
            </Link>
            <Link href="/aide" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">
              {t("cookies")}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
