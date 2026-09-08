"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { toLocale } from "@/i18n/routing";

export type Variante = {
  id: string;
  name: string;
  nameAr: string | null;
  hex: string;
  stock: number;
  price: number | null;
  imageUrl: string | null;
};

type Etat = {
  variantes: Variante[];
  choisie: Variante | null;
  choisir: (id: string) => void;
};

const Contexte = createContext<Etat | null>(null);

/**
 * Etat partage entre le selecteur de couleur et la galerie.
 *
 * Les deux vivent dans des colonnes differentes de la fiche produit : sans ce
 * contexte, choisir une teinte ne pourrait pas changer l'image affichee, qui
 * est precisement l'interet du selecteur.
 *
 * La premiere couleur en stock est preselectionnee : proposer d'emblee une
 * teinte epuisee obligerait a un clic pour rien.
 */
export function VariantProvider({
  variantes,
  children,
}: {
  variantes: Variante[];
  children: React.ReactNode;
}) {
  const premiere = variantes.find((v) => v.stock > 0) ?? variantes[0] ?? null;
  const [id, setId] = useState<string | null>(premiere?.id ?? null);

  const valeur = useMemo<Etat>(
    () => ({
      variantes,
      choisie: variantes.find((v) => v.id === id) ?? null,
      choisir: setId,
    }),
    [variantes, id]
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useVariantes(): Etat {
  return useContext(Contexte) ?? { variantes: [], choisie: null, choisir: () => {} };
}

/** Pastilles de couleur. Une teinte epuisee reste visible mais barree. */
export function VariantPicker() {
  const { variantes, choisie, choisir } = useVariantes();
  const t = useTranslations("product");
  const arabe = toLocale(useLocale()) === "ar";

  if (variantes.length < 1) return null;

  const nom = (v: Variante) => (arabe && v.nameAr ? v.nameAr : v.name);

  return (
    <div>
      <p className="text-sm font-medium">
        {t("colour")}
        {choisie && <span className="ms-2 text-muted-2">{nom(choisie)}</span>}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {variantes.map((v) => {
          const active = choisie?.id === v.id;
          const epuise = v.stock <= 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => choisir(v.id)}
              disabled={epuise}
              title={epuise ? `${nom(v)} — ${t("outOfStock")}` : nom(v)}
              aria-label={nom(v)}
              aria-pressed={active}
              className={cn(
                "relative size-9 rounded-full ring-offset-2 ring-offset-[var(--background)] transition",
                active ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-muted-2",
                epuise && "cursor-not-allowed opacity-40"
              )}
              style={{ backgroundColor: v.hex }}
            >
              {epuise && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-px w-7 rotate-45 bg-white mix-blend-difference" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
