"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  KeyRound,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";

type NavLink = {
  href: string;
  key: string;
  Icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

/** Les libelles viennent du catalogue : seule la structure est figee ici. */
const SECTIONS: { group: string; links: NavLink[] }[] = [
  {
    group: "groupPilot",
    links: [
      { href: "/admin", key: "dashboard", Icon: LayoutDashboard, exact: true },
      { href: "/admin/statistiques", key: "stats", Icon: BarChart3 },
    ],
  },
  {
    group: "groupCatalogue",
    links: [
      { href: "/admin/produits", key: "products", Icon: Package },
      { href: "/admin/categories", key: "categories", Icon: Boxes },
      { href: "/admin/marques", key: "brands", Icon: Tags },
      { href: "/admin/avis", key: "reviews", Icon: MessageSquareText },
    ],
  },
  {
    group: "groupSales",
    links: [
      { href: "/admin/commandes", key: "orders", Icon: ShoppingCart },
      { href: "/admin/clients", key: "customers", Icon: Users },
      { href: "/admin/livraison", key: "shipping", Icon: Truck },
    ],
  },
  {
    group: "groupVisibility",
    links: [
      { href: "/admin/seo", key: "seo", Icon: TrendingUp },
      { href: "/admin/recherche", key: "search", Icon: Search },
      { href: "/admin/connexions", key: "connections", Icon: KeyRound },
    ],
  },
  {
    group: "groupConfig",
    links: [{ href: "/admin/reglages", key: "settings", Icon: Settings }],
  },
];

/** Retire le prefixe de langue : les comparaisons portent sur le chemin nu. */
function stripLocale(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, "");
  return withoutLocale || "/";
}

export function AdminShell({
  user,
  pendingOrders,
  pendingReviews,
  children,
}: {
  user: SessionUser;
  pendingOrders: number;
  pendingReviews: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.shell");
  const tNav = useTranslations("admin.nav");
  const [open, setOpen] = useState(false);
  const pathname = stripLocale(usePathname());

  const badges: Record<string, number> = {
    "/admin/commandes": pendingOrders,
    "/admin/avis": pendingReviews,
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentTitle =
    SECTIONS.flatMap((section) => section.links).find((link) =>
      isActive(link.href, link.exact)
    )?.key ?? null;

  const nav = (
    <nav className="space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.group}>
          <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-2">
            {tNav(section.group)}
          </p>
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const active = isActive(link.href, link.exact);
              const badge = badges[link.href] ?? 0;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <link.Icon className="size-4 shrink-0" />
                    <span className="flex-1">{tNav(link.key)}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[0.625rem] font-bold leading-4",
                          active ? "bg-white/25" : "bg-warning/20 text-warning"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Barre laterale fixe sur grand ecran. */}
      <aside className="fixed inset-y-0 start-0 hidden w-60 flex-col border-e border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <LogoMark className="h-7" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">Pravia</p>
            <p className="truncate text-[0.625rem] uppercase tracking-wider text-muted-2">
              {t("backoffice")}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">{nav}</div>

        <div className="border-t border-border p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Store className="size-4" />
            {t("viewShop")}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </button>
          </form>
        </div>
      </aside>

      {/* Tiroir mobile. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 start-0 flex w-64 flex-col bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2">
                <LogoMark className="h-6" />
                <span className="text-sm font-bold">{t("backoffice")}</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{nav}</div>
            <div className="border-t border-border p-3">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2"
              >
                <Store className="size-4" />
                {t("viewShop")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ps-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-lg lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("openMenu")}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {currentTitle ? tNav(currentTitle) : t("backoffice")}
            </p>
          </div>

          <ThemeToggle compact />

          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-xs sm:block">
              <span className="block font-medium leading-tight">{user.name}</span>
              <span className="block text-muted-2">{t("role")}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
