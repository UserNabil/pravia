import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.taxonomy");
  return { title: t("categoriesTitle") };
}

export default async function AdminCategoriesPage() {
  const t = await getTranslations("admin.taxonomy");
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } }, translations: true },
  });

  return (
    <div>
      <PageHeader
        title={t("categoriesTitle")}
        subtitle={t("categoriesSubtitle")}
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
          translations: Object.fromEntries(
            category.translations.map((row) => [
              row.locale,
              {
                name: row.name ?? "",
                description: row.description ?? "",
                metaTitle: row.metaTitle ?? "",
                metaDescription: row.metaDescription ?? "",
              },
            ])
          ),
        }))}
      />
    </div>
  );
}
