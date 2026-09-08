"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, X } from "lucide-react";

export type LigneImage = { url: string; alt: string };

/**
 * Galerie d'un produit : autant de visuels que necessaire.
 *
 * Un accessoire se vend autant sur son emballage et sur ce qu'il contient que
 * sur la photo du produit nu ; le libelle de chaque visuel dit ce qu'il montre
 * et sert aussi de texte de remplacement aux lecteurs d'ecran.
 *
 * Le premier visuel est la vignette du catalogue : l'ordre se regle a la main
 * plutot que de suivre l'ordre de televersement.
 */
export function ImageRows({ initiales }: { initiales: LigneImage[] }) {
  const t = useTranslations("admin.productForm");
  const [lignes, setLignes] = useState<LigneImage[]>(initiales);
  const [enCours, setEnCours] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [adresse, setAdresse] = useState("");

  /** Une meme adresse deux fois brouillerait la galerie : on l'ignore. */
  function ajouter(url: string, libelle: string) {
    setLignes((rows) => (rows.some((r) => r.url === url) ? rows : [...rows, { url, alt: libelle }]));
  }

  async function televerser(fichiers: File[]) {
    setErreur(null);
    setEnCours(fichiers.length);
    for (const fichier of fichiers) {
      try {
        const corps = new FormData();
        corps.append("fichier", fichier);
        const reponse = await fetch("/api/admin/media", { method: "POST", body: corps });
        const donnees = await reponse.json();
        if (!reponse.ok) {
          setErreur(t(`upload_${donnees.erreur ?? "illisible"}`));
        } else {
          // Le nom du fichier fait un premier libelle : « emballage.jpg »
          // decrit deja la photo, il ne reste qu'a le corriger.
          ajouter(donnees.url, fichier.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
        }
      } catch {
        setErreur(t("upload_illisible"));
      } finally {
        setEnCours((n) => n - 1);
      }
    }
  }

  function deplacer(index: number, pas: number) {
    setLignes((rows) => {
      const cible = index + pas;
      if (cible < 0 || cible >= rows.length) return rows;
      const copie = [...rows];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  }

  function ajouterAdresse() {
    const url = adresse.trim();
    if (!url) return;
    ajouter(url, "");
    setAdresse("");
  }

  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-bold">{t("gallery")}</h2>
      <p className="mt-0.5 text-xs text-muted-2">{t("galleryHint")}</p>

      <div className="mt-4">
        <label htmlFor="fichiersImages" className="label">
          {t("uploadImagesLabel")}
        </label>
        <input
          id="fichiersImages"
          type="file"
          multiple
          accept="image/webp,image/avif,image/jpeg,image/png,image/svg+xml"
          disabled={enCours > 0}
          onChange={(event) => {
            const fichiers = Array.from(event.target.files ?? []);
            if (fichiers.length) void televerser(fichiers);
            event.target.value = "";
          }}
          className="input file:me-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-3 file:py-1 file:text-xs"
        />
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-2">
          {enCours > 0 && <Loader2 className="size-3 animate-spin" />}
          {enCours > 0 ? t("uploadPending") : t("uploadHint")}
        </p>
        {erreur && <p className="mt-1 text-xs text-danger">{erreur}</p>}
      </div>

      {/* Un visuel deja en ligne n'a pas a etre retelecharge pour etre ajoute. */}
      <div className="mt-3 flex gap-2">
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            ajouterAdresse();
          }}
          placeholder={t("imageUrlPlaceholder")}
          aria-label={t("imageUrl")}
          dir="ltr"
          className="input min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={!adresse.trim()}
          onClick={ajouterAdresse}
          className="btn btn-secondary shrink-0 px-3 py-1.5 text-xs"
        >
          <ImagePlus className="size-3.5" />
          {t("addImage")}
        </button>
      </div>

      {lignes.length === 0 ? (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-muted-2">{t("noImages")}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {lignes.map((ligne, index) => (
            <div
              key={ligne.url}
              className="flex items-center gap-3 rounded-xl border border-border p-2.5"
            >
              <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 p-1">
                <Image
                  src={ligne.url}
                  alt=""
                  width={96}
                  height={96}
                  className="size-full object-contain"
                  unoptimized
                />
              </span>

              <input type="hidden" name="imageUrl" value={ligne.url} />

              <div className="min-w-0 flex-1">
                <input
                  name="imageAlt"
                  value={ligne.alt}
                  onChange={(e) =>
                    setLignes((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, alt: e.target.value } : r))
                    )
                  }
                  placeholder={t("imageAltPlaceholder")}
                  aria-label={t("imageAlt")}
                  className="input"
                />
                {index === 0 && (
                  <p className="mt-1 text-[0.6875rem] font-medium text-primary">
                    {t("mainImageBadge")}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => deplacer(index, -1)}
                  aria-label={t("moveUp")}
                  className="flex size-6 items-center justify-center rounded text-muted-2 transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === lignes.length - 1}
                  onClick={() => deplacer(index, 1)}
                  aria-label={t("moveDown")}
                  className="flex size-6 items-center justify-center rounded text-muted-2 transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLignes((rows) => rows.filter((_, i) => i !== index))}
                aria-label={t("removeRow")}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
