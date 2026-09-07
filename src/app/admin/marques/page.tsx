import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteBrandAction, saveBrandAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Marques" };

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader title="Marques" subtitle="Les marques disponibles dans les filtres du catalogue." />

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
