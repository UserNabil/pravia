"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";

const SECTIONS = [
  {
    title: "Pilotage",
    links: [
      { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard, exact: true },
      { href: "/admin/statistiques", label: "Statistiques", Icon: BarChart3 },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/produits", label: "Produits", Icon: Package },
      { href: "/admin/categories", label: "Categories", Icon: Boxes },
      { href: "/admin/marques", label: "Marques", Icon: Tags },
      { href: "/admin/avis", label: "Avis clients", Icon: MessageSquareText },
    ],
  },
  {
    title: "Ventes",
    links: [
      { href: "/admin/commandes", label: "Commandes", Icon: ShoppingCart },
      { href: "/admin/clients", label: "Clients", Icon: Users },
    ],
  },
  {
    title: "Visibilite",
    links: [
      { href: "/admin/seo", label: "Referencement", Icon: TrendingUp },
      { href: "/admin/recherche", label: "Recherche interne", Icon: Search },
    ],
  },
  {
    title: "Configuration",
    links: [{ href: "/admin/reglages", label: "Reglages", Icon: Settings }],
  },
];

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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const badges: Record<string, number> = {
    "/admin/commandes": pendingOrders,
    "/admin/avis": pendingReviews,
  };

  const nav = (
    <nav className="space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-2">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.links.map(({ href, label, Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const badge = badges[href] ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{label}</span>
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
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <LogoMark className="size-7" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">Pravia</p>
            <p className="truncate text-[0.625rem] uppercase tracking-wider text-muted-2">
              Back-office
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
            Voir la boutique
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" />
              Se deconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* Tiroir mobile. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2">
                <LogoMark className="size-6" />
                <span className="text-sm font-bold">Back-office</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
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
                Voir la boutique
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-lg lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentTitle(pathname)}</p>
          </div>

          <ThemeToggle compact />

          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-xs sm:block">
              <span className="block font-medium leading-tight">{user.name}</span>
              <span className="block text-muted-2">Administrateur</span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function currentTitle(pathname: string): string {
  for (const section of SECTIONS) {
    for (const link of section.links) {
      if (link.exact ? pathname === link.href : pathname.startsWith(link.href)) return link.label;
    }
  }
  return "Back-office";
}
