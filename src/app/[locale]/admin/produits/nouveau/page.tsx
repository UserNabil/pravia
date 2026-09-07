import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { createProductAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.productForm");
  return { title: t("newTitle") };
}

export default async function NewProductPage() {
  const [t, categories, brands, count] = await Promise.all([
    getTranslations("admin.productForm"),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.product.count(),
  ]);

  return (
    <div>
      <Link
        href="/admin/produits"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("backToProducts")}
      </Link>

      <div className="mt-3">
        <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      </div>

      <ProductForm
        action={createProductAction}
        submitLabel={t("submitCreate")}
        categories={categories}
        brands={brands}
        values={{
          title: "",
          subtitle: "",
          description: "",
          price: "",
          compareAtPrice: "",
          stock: "0",
          sku: `PRV-${String(count + 1).padStart(4, "0")}`,
          condition: "NEW",
          minOrder: "1",
          warrantyMonths: "24",
          categoryId: "",
          brandId: "",
          storage: "",
          color: "",
          carrier: "",
          imageUrl: "",
          metaTitle: "",
          metaDescription: "",
          ogImage: "",
          noIndex: false,
          tradeAssurance: false,
          readyToShip: true,
          featured: false,
          active: true,
          specs: [],
          translations: {},
        }}
      />
    </div>
  );
}
