import Link from "next/link";
import { Suspense } from "react";
import { Heart, LayoutGrid, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/queries";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { CategoryMenu } from "./category-menu";

const NAV_LINKS = [
  { href: "/produits?tri=best-sellers", label: "Meilleures ventes" },
  { href: "/produits?tri=newest", label: "Nouveautes" },
  { href: "/produits?assurance=1", label: "Trade Assurance" },
  { href: "/aide", label: "Service client" },
  { href: "/aide#vendeurs", label: "Espace vendeur" },
];

export async function SiteHeader() {
  const [user, categories, banner] = await Promise.all([
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.setting.findUnique({ where: { key: "banner.text" } }),
  ]);

  const [cartCount, wishlistCount] = user
    ? await Promise.all([
        getCartCount(user.id),
        db.wishlistItem.count({ where: { userId: user.id } }),
      ])
    : [0, 0];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
      {banner?.value && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
          {banner.value}
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <MobileNav categories={categories} user={user} />
        <Logo />

        <Suspense fallback={<div className="hidden h-10 flex-1 rounded-full bg-surface-2 md:block" />}>
          <SearchBar categories={categories} className="mx-2 hidden flex-1 md:flex" />
        </Suspense>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2.5">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <IconLink href="/favoris" label="Favoris" count={wishlistCount}>
            <Heart className="size-[18px]" />
          </IconLink>

          <IconLink href="/panier" label="Panier" count={cartCount}>
            <ShoppingBag className="size-[18px]" />
          </IconLink>

          <UserMenu user={user} />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
        <Suspense fallback={<div className="h-10 md:hidden" />}>
          <SearchBar categories={categories} className="mb-3 flex md:hidden" />
        </Suspense>
      </div>

      <nav className="hidden border-t border-border md:block">
        <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-1 px-4 lg:px-6">
          <CategoryMenu categories={categories} />
          <span className="mx-2 h-5 w-px bg-border" />
          <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
            {NAV_LINKS.map((link) => (
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
            className="ml-auto hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary transition-colors hover:bg-primary-soft lg:flex"
          >
            <LayoutGrid className="size-3.5" />
            Tout le catalogue
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
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
