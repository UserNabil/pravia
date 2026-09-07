"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, LayoutDashboard, LogOut, Package, Settings, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
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
      <div className="flex shrink-0 items-center gap-1.5">
        <Link href="/connexion" className="btn btn-ghost hidden shrink-0 lg:inline-flex">
          {t("signIn")}
        </Link>
        <Link href="/inscription" className="btn btn-primary shrink-0 px-3 sm:px-4">
          <span className="hidden lg:inline">{t("signUp")}</span>
          <span className="lg:hidden">{t("signUpShort")}</span>
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
        aria-label={t("menu")}
        className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-transparent transition-all hover:ring-border-strong"
        style={{ backgroundColor: user.avatarColor }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/20"
        >
          <div className="border-b border-border px-3.5 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-2">{user.email}</p>
          </div>

          <nav className="p-1">
            {user.role === "ADMIN" && (
              <MenuLink href="/admin" icon={LayoutDashboard} onSelect={() => setOpen(false)}>
                {tNav("backoffice")}
              </MenuLink>
            )}
            <MenuLink href="/compte" icon={User} onSelect={() => setOpen(false)}>
              {t("myAccount")}
            </MenuLink>
            <MenuLink href="/compte/commandes" icon={Package} onSelect={() => setOpen(false)}>
              {t("myOrders")}
            </MenuLink>
            <MenuLink href="/favoris" icon={Heart} onSelect={() => setOpen(false)}>
              {t("myFavourites")}
            </MenuLink>
            <MenuLink href="/compte/adresses" icon={Settings} onSelect={() => setOpen(false)}>
              {t("myAddresses")}
            </MenuLink>
          </nav>

          <form action={logoutAction} className="border-t border-border p-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" />
              {t("signOut")}
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
