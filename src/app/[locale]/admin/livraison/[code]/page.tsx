import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { CommuneGrid } from "@/components/admin/shipping-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communes",
  robots: { index: false, follow: false },
};

/** Surcharges de tarif, commune par commune, pour une wilaya donnee. */
export default async function AdminWilayaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = Number(raw);
  if (!Number.isInteger(code)) notFound();

  const wilaya = await db.wilaya.findUnique({
    where: { code },
    select: {
      code: true,
      name: true,
      nameAr: true,
      shippingFee: true,
      communes: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameAr: true, shippingFee: true },
      },
    },
  });

  if (!wilaya) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/livraison"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        Retour a la grille
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="font-mono text-lg text-muted-2">
            {String(wilaya.code).padStart(2, "0")}
          </span>{" "}
          {wilaya.name}
          <span className="ms-3 text-lg text-muted-2" dir="rtl">
            {wilaya.nameAr}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-2">
          {wilaya.communes.length} communes. Seules celles qui doivent couter plus cher — ou moins —
          que le reste de la wilaya demandent une saisie.
        </p>
      </div>

      <CommuneGrid
        wilayaCode={wilaya.code}
        wilayaName={wilaya.name}
        wilayaFee={wilaya.shippingFee}
        communes={wilaya.communes}
      />
    </div>
  );
}
