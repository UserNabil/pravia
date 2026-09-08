"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { LayoutDashboard, LogOut, Menu, Package, User, X } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function MobileNav({
  categories,
  user,
}: {
  categories: { id: string; slug: string; name: string; icon: string }[];
  user: SessionUser | null;
}) {
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  // La barre de navigation du bas ouvre le meme tiroir : un seul menu a
  // maintenir, deux points d'entree.
  useEffect(() => {
    const ouvrir = () => setOpen(true);
    window.addEventListener("pravia:ouvrir-menu", ouvrir);
    return () => window.removeEventListener("pravia:ouvrir-menu", ouvrir);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /**
   * Le tiroir est rendu dans <body>, pas a cet endroit de l'arbre.
   *
   * L'en-tete porte un backdrop-blur. Un ancetre filtre etablit un bloc
   * conteneur pour ses descendants en position:fixed : inset-0 se calait donc
   * sur les 144 px de l'en-tete au lieu du viewport, et le menu sortait
   * tronque, sa zone defilante reduite a une vingtaine de pixels. Le portail
   * replace l'overlay a la racine du document, hors de portee du filtre.
   */
  const tiroir = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={tCommon("close")}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">{t("navigation")}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={tCommon("close")}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
            {t("categories")}
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
            {t("shortcuts")}
          </p>
          <nav className="space-y-0.5">
            <Link
              href="/produits"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
            >
              <Package className="size-4 text-muted" />
              {t("allCatalogue")}
            </Link>
            {user && (
              <>
                <Link
                  href="/compte"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                >
                  <User className="size-4 text-muted" />
                  {tAccount("myAccount")}
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-surface-2"
                  >
                    <LayoutDashboard className="size-4 text-muted" />
                    {t("backoffice")}
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="space-y-3 border-t border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{t("theme")}</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{t("language")}</span>
            <LanguageSwitcher />
          </div>

          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary w-full">
                <LogOut className="size-4" />
                {tAccount("signOut")}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/connexion" className="btn btn-secondary">
                {tAccount("signIn")}
              </Link>
              <Link href="/inscription" className="btn btn-primary">
                {tAccount("signUpShort")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Le point de rupture du tiroir suit celui du bouton : en md:hidden il
          disparaissait entre 768 et 1024 px alors que le bouton restait
          affiche, et le menu ne s'ouvrait pas sur tablette. */}
      {open && createPortal(tiroir, document.body)}
    </>
  );
}
