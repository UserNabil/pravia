import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteBrandAction, saveBrandAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.taxonomy");
  return { title: t("brandsTitle") };
}

export default async function AdminBrandsPage() {
  const t = await getTranslations("admin.taxonomy");
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader title={t("brandsTitle")} subtitle={t("brandsSubtitle")} />

      <TaxonomyManager
        kind="brand"
        saveAction={saveBrandAction}
        deleteAction={deleteBrandAction}
        rows={brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          accent: brand.accent,
          productCount: brand._count.products,
        }))}
      />
    </div>
  );
}
