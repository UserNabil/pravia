"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Package, User, X } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function MobileNav({
  categories,
  user,
}: {
  categories: { id: string; slug: string; name: string; icon: string }[];
  user: SessionUser | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
                Categories
              </p>
              <nav className="space-y-0.5">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/produits?categorie=${category.slug}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                  >
                    <CategoryIcon name={category.icon} className="size-4 text-muted" />
                    {category.name}
                  </Link>
                ))}
              </nav>

              <p className="px-2 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-2">
                Raccourcis
              </p>
              <nav className="space-y-0.5">
                <Link
                  href="/produits"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                >
                  <Package className="size-4 text-muted" />
                  Tout le catalogue
                </Link>
                {user && (
                  <>
                    <Link
                      href="/compte"
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                    >
                      <User className="size-4 text-muted" />
                      Mon compte
                    </Link>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                      >
                        <LayoutDashboard className="size-4 text-muted" />
                        Back-office
                      </Link>
                    )}
                  </>
                )}
              </nav>
            </div>

            <div className="space-y-3 border-t border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Theme</span>
                <ThemeToggle />
              </div>

              {user ? (
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-secondary w-full">
                    <LogOut className="size-4" />
                    Se deconnecter
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/connexion" className="btn btn-secondary">
                    Connexion
                  </Link>
                  <Link href="/inscription" className="btn btn-primary">
                    Inscription
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
