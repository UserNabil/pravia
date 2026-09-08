"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";

export type LigneVariante = {
  id: string | null;
  name: string;
  nameAr: string | null;
  hex: string;
  stock: number;
  imageUrl: string | null;
};

/**
 * Declinaisons de couleur d'un produit.
 *
 * Chaque ligne porte son identifiant en champ cache : l'enregistrement met a
 * jour les teintes existantes plutot que de les recreer, faute de quoi les
 * paniers et les commandes perdraient la couleur a laquelle ils renvoient.
 *
 * Un produit sans declinaison n'affiche aucun selecteur en boutique et
 * fonctionne comme avant : la section peut rester vide.
 */
export function VariantRows({ initiales }: { initiales: LigneVariante[] }) {
  const t = useTranslations("admin.productForm");
  const [lignes, setLignes] = useState<LigneVariante[]>(initiales);
  const [envoi, setEnvoi] = useState<number | null>(null);

  function modifier(index: number, champ: Partial<LigneVariante>) {
    setLignes((rows) => rows.map((r, i) => (i === index ? { ...r, ...champ } : r)));
  }

  async function televerser(index: number, fichier: File) {
    setEnvoi(index);
    try {
      const corps = new FormData();
      corps.append("fichier", fichier);
      const reponse = await fetch("/api/admin/media", { method: "POST", body: corps });
      const donnees = await reponse.json();
      if (reponse.ok) modifier(index, { imageUrl: donnees.url });
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <section className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{t("variants")}</h2>
          <p className="mt-0.5 text-xs text-muted-2">{t("variantsHint")}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setLignes((rows) => [
              ...rows,
              { id: null, name: "", nameAr: "", hex: "#111827", stock: 0, imageUrl: null },
            ])
          }
          className="btn btn-secondary shrink-0 px-2.5 py-1 text-xs"
        >
          <Plus className="size-3.5" />
          {t("addVariant")}
        </button>
      </div>

      {lignes.length === 0 ? (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-muted-2">{t("noVariant")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {lignes.map((ligne, index) => (
            <div
              key={ligne.id ?? `nouveau-${index}`}
              className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[auto_1fr_1fr_6rem_auto]"
            >
              <input type="hidden" name="variantId" value={ligne.id ?? ""} />

              {/* Pastille : le meme code hexadecimal sert au selecteur en
                  boutique et, au peuplement, a teinter le visuel genere. */}
              <label className="flex items-center gap-2">
                <span className="sr-only">{t("variantColour")}</span>
                <input
                  type="color"
                  name="variantHex"
                  value={ligne.hex}
                  onChange={(e) => modifier(index, { hex: e.target.value })}
                  className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                />
              </label>

              <input
                name="variantName"
                value={ligne.name}
                onChange={(e) => modifier(index, { name: e.target.value })}
                placeholder={t("variantNamePlaceholder")}
                aria-label={t("variantName")}
                className="input"
              />

              <input
                name="variantNameAr"
                value={ligne.nameAr ?? ""}
                onChange={(e) => modifier(index, { nameAr: e.target.value })}
                placeholder={t("variantNameArPlaceholder")}
                aria-label={t("variantNameAr")}
                dir="rtl"
                className="input"
              />

              <input
                name="variantStock"
                type="number"
                min={0}
                value={ligne.stock}
                onChange={(e) => modifier(index, { stock: Number(e.target.value) || 0 })}
                aria-label={t("variantStock")}
                className="input tabular-nums"
              />

              <button
                type="button"
                onClick={() => setLignes((rows) => rows.filter((_, i) => i !== index))}
                aria-label={t("removeRow")}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3 sm:col-span-5">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {ligne.imageUrl ? (
                    <Image
                      src={ligne.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="size-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="block size-full"
                      style={{ backgroundColor: ligne.hex }}
                      aria-hidden="true"
                    />
                  )}
                </span>

                <input type="hidden" name="variantImage" value={ligne.imageUrl ?? ""} />

                <input
                  type="file"
                  accept="image/webp,image/avif,image/jpeg,image/png,image/svg+xml"
                  disabled={envoi === index}
                  onChange={(e) => {
                    const fichier = e.target.files?.[0];
                    if (fichier) void televerser(index, fichier);
                    e.target.value = "";
                  }}
                  aria-label={t("variantImage")}
                  className="input file:me-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-xs"
                />

                {envoi === index && <Loader2 className="size-4 shrink-0 animate-spin text-muted" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
