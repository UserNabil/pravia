import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organisez le catalogue et l'ordre d'affichage sur la boutique."
      />

      <TaxonomyManager
        kind="category"
        saveAction={saveCategoryAction}
        deleteAction={deleteCategoryAction}
        rows={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: category.description,
          sortOrder: category.sortOrder,
          metaTitle: category.metaTitle,
          metaDescription: category.metaDescription,
          noIndex: category.noIndex,
          productCount: category._count.products,
        }))}
      />
    </div>
  );
}
