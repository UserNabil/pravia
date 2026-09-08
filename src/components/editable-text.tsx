"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { enregistrerTexteAccueil } from "@/app/actions/home-content";
import type { TexteAccueil } from "@/lib/home-content";
import { cn } from "@/lib/format";

const ContexteEdition = createContext(false);

/**
 * Edition du contenu depuis la boutique, sur la page telle qu'elle s'affiche.
 *
 * Un ecran de back-office montrerait des champs hors de leur contexte : ici
 * l'administrateur voit le rendu reel et clique sur le texte a corriger. Le
 * mode reste ferme par defaut, sinon toute visite en tant qu'administrateur
 * afficherait des pointilles et exposerait a des modifications par megarde.
 */
export function ModeEdition({
  autorise,
  ouvertParDefaut,
  children,
}: {
  autorise: boolean;
  ouvertParDefaut: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("homeEditor");
  const [actif, setActif] = useState(autorise && ouvertParDefaut);
  const [monte, setMonte] = useState(false);

  useEffect(() => setMonte(true), []);

  return (
    <ContexteEdition.Provider value={autorise && actif}>
      {children}

      {autorise &&
        monte &&
        createPortal(
          <button
            type="button"
            onClick={() => setActif((v) => !v)}
            className={cn(
              "fixed bottom-20 end-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-colors md:bottom-5",
              actif
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground hover:opacity-90",
            )}
          >
            {actif ? (
              <Check className="size-4" />
            ) : (
              <Pencil className="size-4" />
            )}
            {actif ? t("done") : t("editContent")}
          </button>,
          document.body,
        )}
    </ContexteEdition.Provider>
  );
}

/**
 * Un texte de la banniere, cliquable quand le mode edition est ouvert.
 *
 * Hors edition le composant ne rend que la chaine, sans balise : il se glisse
 * dans un titre ou un bouton sans en changer la mise en forme.
 */
export function TexteEditable({
  champ,
  texte,
  aide,
  className,
}: {
  champ: string;
  texte: TexteAccueil;
  aide?: string;
  className?: string;
}) {
  const editable = useContext(ContexteEdition);
  const t = useTranslations("homeEditor");
  const locale = useLocale();
  const router = useRouter();

  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState(texte.brut);
  const [envoi, setEnvoi] = useState(false);
  const zone = useRef<HTMLTextAreaElement>(null);

  // Le serveur peut renvoyer un texte plus recent apres enregistrement : on ne
  // se resynchronise qu'en dehors d'une saisie, pour ne rien ecraser.
  useEffect(() => {
    if (!ouvert) setValeur(texte.brut);
  }, [texte.brut, ouvert]);

  // La zone de saisie epouse la typographie du titre : sa hauteur ne peut pas
  // etre fixee d'avance, elle se recalcule a chaque frappe.
  useEffect(() => {
    const el = zone.current;
    if (!ouvert || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ouvert, valeur]);

  if (!editable) return <>{texte.rendu}</>;

  async function enregistrer(nouvelle: string) {
    setEnvoi(true);
    await enregistrerTexteAccueil(champ, locale, nouvelle);
    setEnvoi(false);
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <span
        role="button"
        tabIndex={0}
        title={t("clickToEdit")}
        onClick={(e) => {
          // Le libelle d'un bouton d'appel a l'action vit dans un lien :
          // en mode edition, le clic ouvre la saisie au lieu de naviguer.
          e.preventDefault();
          e.stopPropagation();
          setOuvert(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOuvert(true);
          }
        }}
        className={cn(
          "cursor-text rounded outline-1 outline-dashed outline-offset-4 outline-primary/50 transition-colors hover:bg-primary/10",
          className,
        )}
      >
        {texte.rendu}
      </span>
    );
  }

  return (
    <span className="relative block">
      <textarea
        ref={zone}
        autoFocus
        rows={1}
        value={valeur}
        disabled={envoi}
        onChange={(e) => setValeur(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValeur(texte.brut);
            setOuvert(false);
          }
          // Entree valide ; le retour a la ligne reste possible avec Maj.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void enregistrer(valeur);
          }
        }}
        className={cn(
          "block w-full resize-none overflow-hidden rounded-lg border border-primary bg-surface p-1 outline-none",
          className,
        )}
      />

      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-normal tracking-normal text-muted">
        <button
          type="button"
          disabled={envoi}
          onClick={() => void enregistrer(valeur)}
          className="btn btn-primary px-2.5 py-1 text-xs"
        >
          {envoi ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {t("save")}
        </button>

        <button
          type="button"
          disabled={envoi}
          onClick={() => {
            setValeur(texte.brut);
            setOuvert(false);
          }}
          className="btn btn-secondary px-2.5 py-1 text-xs"
        >
          <X className="size-3.5" />
          {t("cancel")}
        </button>

        {texte.personnalise && (
          <button
            type="button"
            disabled={envoi}
            onClick={() => void enregistrer("")}
            className="btn btn-secondary px-2.5 py-1 text-xs"
            title={t("resetHint")}
          >
            <RotateCcw className="size-3.5" />
            {t("reset")}
          </button>
        )}

        {aide && <span className="ms-1 text-muted-2">{aide}</span>}
      </span>
    </span>
  );
}
