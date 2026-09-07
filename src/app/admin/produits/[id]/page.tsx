import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/actions-ui";
import { ProductForm } from "@/components/admin/product-form";
import { deleteProductAction, updateProductAction } from "@/app/actions/admin";
import { formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        specs: { orderBy: { sortOrder: "asc" } },
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
        <ChevronLeft className="size-4" />
        Retour aux produits
      </Link>

      <div className="mt-3">
        <PageHeader
          title={product.title}
          subtitle={`${product.sku} — cree le ${formatDateTime(product.createdAt)} — ${formatNumber(
            product.soldCount
          )} vendus, ${product._count.reviews} avis`}
          action={
            <ConfirmButton
              action={deleteProductAction.bind(null, product.id)}
              confirmLabel="Confirmer la suppression"
              className="btn btn-danger"
            >
              <Trash2 className="size-4" />
              Supprimer
            </ConfirmButton>
          }
        />
      </div>

      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        submitLabel="Enregistrer les modifications"
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
          tradeAssurance: product.tradeAssurance,
          readyToShip: product.readyToShip,
          featured: product.featured,
          active: product.active,
          specs: product.specs.map((spec) => ({ label: spec.label, value: spec.value })),
        }}
      />
    </div>
  );
}
