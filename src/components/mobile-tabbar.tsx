"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Menu, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Barre de navigation fixe en bas de l'ecran, sur mobile uniquement.
 *
 * Trois entrees : la boutique, le panier, le menu. C'est la disposition que le
 * pouce atteint sans deplacer la main, et celle qu'attendent les acheteurs
 * habitues aux applications — un en-tete seul obligerait a remonter en haut de
 * page a chaque action.
 *
 * Le menu ouvre le meme tiroir que le bouton de l'en-tete : l'evenement est
 * relaye plutot que duplique, pour n'avoir qu'un seul tiroir a maintenir.
 */
export function MobileTabBar({ cartCount }: { cartCount: number }) {
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");
  const pathname = usePathname();
  const [monte, setMonte] = useState(false);

  // Le portail evite que la barre soit prise dans un ancetre filtre : l'en-tete
  // porte un backdrop-blur, qui redefinit le bloc conteneur du position:fixed.
  if (typeof document === "undefined") return null;

  const onglets = [
    { href: "/produits", label: t("shop"), Icon: Store, actif: pathname.startsWith("/produits") },
    {
      href: "/panier",
      label: tAccount("myCart"),
      Icon: ShoppingBag,
      actif: pathname.startsWith("/panier"),
      badge: cartCount,
    },
  ];

  return createPortal(
    <>
      {/* Reserve la hauteur de la barre : sans cela, elle masquerait le bas de
          page, notamment le bouton d'ajout au panier d'une fiche produit. */}
      <div className="h-16 lg:hidden" aria-hidden="true" />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {onglets.map(({ href, label, Icon, actif, badge }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                actif ? "text-primary" : "text-muted"
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={actif ? 2.2 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="absolute -end-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => {
              // Le tiroir de l'en-tete ecoute cet evenement : une seule
              // implementation du menu, deux points d'entree.
              window.dispatchEvent(new CustomEvent("pravia:ouvrir-menu"));
              setMonte((v) => !v);
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted transition-colors hover:text-foreground"
          >
            <Menu className="size-5" strokeWidth={1.8} />
            {t("menu")}
          </button>
        </div>
      </nav>
    </>,
    document.body
  );
}
