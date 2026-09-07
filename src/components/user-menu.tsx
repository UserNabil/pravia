"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, LayoutDashboard, LogOut, Package, Settings, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/connexion" className="btn btn-ghost hidden sm:inline-flex">
          Connexion
        </Link>
        <Link href="/inscription" className="btn btn-primary">
          <span className="hidden sm:inline">Creer un compte</span>
          <span className="sm:hidden">S&apos;inscrire</span>
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu du compte"
        className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-transparent transition-all hover:ring-border-strong"
        style={{ backgroundColor: user.avatarColor }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/20"
        >
          <div className="border-b border-border px-3.5 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-2">{user.email}</p>
          </div>

          <nav className="p-1">
            {user.role === "ADMIN" && (
              <MenuLink href="/admin" icon={LayoutDashboard} onSelect={() => setOpen(false)}>
                Back-office
              </MenuLink>
            )}
            <MenuLink href="/compte" icon={User} onSelect={() => setOpen(false)}>
              Mon compte
            </MenuLink>
            <MenuLink href="/compte/commandes" icon={Package} onSelect={() => setOpen(false)}>
              Mes commandes
            </MenuLink>
            <MenuLink href="/favoris" icon={Heart} onSelect={() => setOpen(false)}>
              Mes favoris
            </MenuLink>
            <MenuLink href="/compte/adresses" icon={Settings} onSelect={() => setOpen(false)}>
              Mes adresses
            </MenuLink>
          </nav>

          <form action={logoutAction} className="border-t border-border p-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" />
              Se deconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onSelect,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-2"
    >
      <Icon className="size-4 text-muted" />
      {children}
    </Link>
  );
}
