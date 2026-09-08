"use client";

import { useActionState, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Loader2, Save, Search } from "lucide-react";
import { saveWilayaFeesAction, saveCommuneFeesAction } from "@/app/actions/admin-shipping";
import { cn } from "@/lib/format";

type Wilaya = {
  code: number;
  name: string;
  nameAr: string;
  shippingFee: number;
  active: boolean;
  communes: number;
  overrides: number;
};

/**
 * Grille des tarifs par wilaya.
 *
 * Les 69 lignes tiennent dans un seul formulaire : renseigner une grille se
 * fait d'une traite, pas en 69 enregistrements successifs. Le filtre porte sur
 * les deux graphies, un gestionnaire pouvant chercher « Bejaia » ou « بجاية ».
 */
export function WilayaGrid({ wilayas }: { wilayas: Wilaya[] }) {
  const [state, action, pending] = useActionState(saveWilayaFeesAction, {});
  const [filtre, setFiltre] = useState("");

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return wilayas;
    return wilayas.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.nameAr.includes(filtre.trim()) ||
        String(w.code).padStart(2, "0").includes(q)
    );
  }, [wilayas, filtre]);

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Filtrer par nom ou code"
            className="input ps-9"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer la grille
        </button>
      </div>

      {state.errorKey && (
        <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
          Montant invalide{state.values?.wilaya ? ` (wilaya ${state.values.wilaya})` : ""}.
        </p>
      )}
      {state.successKey && (
        <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
          Grille enregistree : {state.values?.count} wilayas.
        </p>
      )}

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs text-muted-2">
            <tr>
              <th className="p-3 text-start font-medium">Wilaya</th>
              <th className="p-3 text-start font-medium">Tarif (DA)</th>
              <th className="p-3 text-start font-medium">Communes</th>
              <th className="p-3 text-start font-medium">Livree</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibles.map((w) => (
              <tr key={w.code} className={cn(!w.active && "opacity-60")}>
                <td className="p-3">
                  <span className="font-mono text-xs text-muted-2">
                    {String(w.code).padStart(2, "0")}
                  </span>{" "}
                  <span className="font-medium">{w.name}</span>
                  <span className="ms-2 text-xs text-muted-2" dir="rtl">
                    {w.nameAr}
                  </span>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    name={`fee-${w.code}`}
                    defaultValue={Math.round(w.shippingFee / 100)}
                    min={0}
                    step={50}
                    className="input w-28 tabular-nums"
                  />
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/livraison/${w.code}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {w.communes} communes
                    {w.overrides > 0 && ` — ${w.overrides} tarif(s) propre(s)`}
                  </Link>
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    name="active"
                    value={w.code}
                    defaultChecked={w.active}
                    className="size-4 accent-[var(--primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}

type Commune = { id: string; name: string; nameAr: string; shippingFee: number | null };

/**
 * Surcharges d'une wilaya. Laisser un champ vide fait retomber la commune sur
 * le tarif de sa wilaya : c'est le cas courant, et il ne demande aucune saisie.
 */
export function CommuneGrid({
  wilayaCode,
  wilayaName,
  wilayaFee,
  communes,
}: {
  wilayaCode: number;
  wilayaName: string;
  wilayaFee: number;
  communes: Commune[];
}) {
  const [state, action, pending] = useActionState(saveCommuneFeesAction, {});
  const [filtre, setFiltre] = useState("");

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return communes;
    return communes.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameAr.includes(filtre.trim())
    );
  }, [communes, filtre]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="wilayaCode" value={wilayaCode} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Filtrer une commune"
            className="input ps-9"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </button>
      </div>

      <p className="text-xs text-muted-2">
        Tarif de {wilayaName} : <strong>{Math.round(wilayaFee / 100)} DA</strong>. Un champ laisse
        vide applique ce tarif.
      </p>

      {state.errorKey && (
        <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">Montant invalide.</p>
      )}
      {state.successKey && (
        <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
          {state.values?.count} communes enregistrees.
        </p>
      )}

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs text-muted-2">
            <tr>
              <th className="p-3 text-start font-medium">Commune</th>
              <th className="p-3 text-start font-medium">Tarif propre (DA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibles.map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  <span className="font-medium">{c.name}</span>
                  <span className="ms-2 text-xs text-muted-2" dir="rtl">
                    {c.nameAr}
                  </span>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    name={`commune-${c.id}`}
                    defaultValue={c.shippingFee == null ? "" : Math.round(c.shippingFee / 100)}
                    placeholder={String(Math.round(wilayaFee / 100))}
                    min={0}
                    step={50}
                    className="input w-32 tabular-nums"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
