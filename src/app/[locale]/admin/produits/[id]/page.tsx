import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/actions-ui";
import { ProductForm } from "@/components/admin/product-form";
import { deleteProductAction, updateProductAction } from "@/app/actions/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [{ id, locale: rawLocale }, t] = await Promise.all([
    params,
    getTranslations("admin.productForm"),
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];

  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        specs: { orderBy: { sortOrder: "asc" } },
        translations: true,
        _count: { select: { reviews: true, orderItems: true } },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

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
        <PageHeader
          title={product.title}
          subtitle={t("editSubtitle", {
            sku: product.sku,
            date: formatDateTime(product.createdAt, tag),
            sold: formatNumber(product.soldCount, tag),
            reviews: product._count.reviews,
          })}
          action={
            <ConfirmButton
              action={deleteProductAction.bind(null, product.id)}
              confirmLabel={t("confirmDelete")}
              className="btn btn-danger"
            >
              <Trash2 className="size-4" />
              {t("delete")}
            </ConfirmButton>
          }
        />
      </div>

      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        submitLabel={t("submitUpdate")}
        slug={product.slug}
        categories={categories}
        brands={brands}
        values={{
          id: product.id,
          title: product.title,
          subtitle: product.subtitle ?? "",
          description: product.description,
          price: (product.price / 100).toFixed(2),
          compareAtPrice: product.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : "",
          stock: String(product.stock),
          sku: product.sku,
          condition: product.condition,
          minOrder: String(product.minOrder),
          warrantyMonths: String(product.warrantyMonths),
          categoryId: product.categoryId,
          brandId: product.brandId,
          storage: product.storage ?? "",
          color: product.color ?? "",
          carrier: product.carrier ?? "",
          imageUrl: product.images[0]?.url ?? "",
          metaTitle: product.metaTitle ?? "",
          metaDescription: product.metaDescription ?? "",
          ogImage: product.ogImage ?? "",
          noIndex: product.noIndex,
          tradeAssurance: product.tradeAssurance,
          readyToShip: product.readyToShip,
          featured: product.featured,
          active: product.active,
          specs: product.specs.map((spec) => ({ label: spec.label, value: spec.value })),
          translations: Object.fromEntries(
            product.translations.map((row) => [
              row.locale,
              {
                title: row.title ?? "",
                subtitle: row.subtitle ?? "",
                description: row.description ?? "",
                metaTitle: row.metaTitle ?? "",
                metaDescription: row.metaDescription ?? "",
              },
            ])
          ),
        }}
      />
    </div>
  );
}
