import type { Metadata } from "next";
import { db } from "@/lib/db";
import { WilayaGrid } from "@/components/admin/shipping-grid";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Livraison",
  robots: { index: false, follow: false },
};

/**
 * Grille des frais de livraison, wilaya par wilaya.
 *
 * Le back-office reste monolingue, comme le reste de l'administration : les
 * libelles y sont ecrits en clair plutot que passes par les catalogues de
 * traduction, reserves a la boutique.
 */
export default async function AdminShippingPage() {
  const wilayas = await db.wilaya.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      nameAr: true,
      shippingFee: true,
      deskFee: true,
      active: true,
      _count: { select: { communes: true } },
      communes: { where: { shippingFee: { not: null } }, select: { id: true } },
    },
  });

  const lignes = wilayas.map((w) => ({
    code: w.code,
    name: w.name,
    nameAr: w.nameAr,
    shippingFee: w.shippingFee,
    deskFee: w.deskFee,
    active: w.active,
    communes: w._count.communes,
    overrides: w.communes.length,
  }));

  const actives = lignes.filter((w) => w.active);
  const moyenne = actives.length
    ? Math.round(actives.reduce((s, w) => s + w.shippingFee, 0) / actives.length)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Livraison</h1>
        <p className="mt-1 text-sm text-muted-2">
          Un tarif par wilaya, applique a toutes ses communes. Une commune peut porter le sien
          lorsqu'elle coute plus cher a desservir. Le tarif de retrait au bureau est
          facultatif : laisse vide, le retrait coute le meme prix que le domicile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Wilayas livrees" value={`${actives.length} / ${lignes.length}`} />
        <Stat label="Tarif moyen" value={formatPrice(moyenne, "fr-FR")} />
        <Stat
          label="Livraison offerte des"
          value={formatPrice(FREE_SHIPPING_THRESHOLD, "fr-FR")}
        />
      </div>

      <WilayaGrid wilayas={lignes} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-2">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
