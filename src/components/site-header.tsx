import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Heart, LayoutGrid, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/queries";
import { getTranslatedCategories } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { CategoryMenu } from "./category-menu";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [t, tAccount] = await Promise.all([
    getTranslations("nav"),
    getTranslations("account"),
  ]);

  const [user, categories, bannerRows] = await Promise.all([
    getCurrentUser(),
    getTranslatedCategories(locale),
    db.setting.findMany({ where: { key: { in: [`banner.text.${locale}`, "banner.text"] } } }),
  ]);

  const [cartCount, wishlistCount] = user
    ? await Promise.all([
        getCartCount(user.id),
        db.wishlistItem.count({ where: { userId: user.id } }),
      ])
    : [0, 0];

  const banner =
    bannerRows.find((row) => row.key === `banner.text.${locale}`)?.value?.trim() ||
    bannerRows.find((row) => row.key === "banner.text")?.value?.trim() ||
    null;

  const navLinks = [
    { href: "/produits?tri=best-sellers", label: t("bestSellers") },
    { href: "/produits?tri=newest", label: t("newArrivals") },
    { href: "/produits?assurance=1", label: t("tradeAssurance") },
    { href: "/aide", label: t("customerService") },
    { href: "/aide#vendeurs", label: t("sellerArea") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
      {banner && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
          {banner}
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:gap-3 lg:px-6">
        <MobileNav categories={categories} user={user} />
        <Logo />

        <Suspense fallback={<div className="hidden h-10 flex-1 rounded-full bg-surface-2 lg:block" />}>
          <SearchBar categories={categories} className="mx-2 hidden min-w-0 flex-1 lg:flex" />
        </Suspense>

        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5 lg:gap-2.5">
          <div className="hidden xl:block">
            <ThemeToggle />
          </div>

          {/* Sous 640 px, le choix de langue passe par le menu mobile. */}
          <div className="hidden sm:block">
            <Suspense fallback={<div className="h-8 w-14 rounded-full bg-surface-2" />}>
              <LanguageSwitcher />
            </Suspense>
          </div>

          <IconLink href="/favoris" label={tAccount("myFavourites")} count={wishlistCount}>
            <Heart className="size-[18px]" />
          </IconLink>

          <IconLink href="/panier" label={tAccount("myCart")} count={cartCount}>
            <ShoppingBag className="size-[18px]" />
          </IconLink>

          <UserMenu user={user} />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
        <Suspense fallback={<div className="h-10 lg:hidden" />}>
          <SearchBar categories={categories} className="mb-3 flex lg:hidden" />
        </Suspense>
      </div>

      <nav className="hidden border-t border-border md:block">
        <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-1 px-4 lg:px-6">
          <CategoryMenu categories={categories} />
          <span className="mx-2 h-5 w-px bg-border" />
          <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/produits"
            className="ms-auto hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary transition-colors hover:bg-primary-soft lg:flex"
          >
            <LayoutGrid className="size-3.5" />
            {t("allCatalogue")}
          </Link>
        </div>
      </nav>
    </header>
  );
}

function IconLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
