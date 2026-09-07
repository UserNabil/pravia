import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { createProductAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  const [categories, brands, count] = await Promise.all([
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
        <ChevronLeft className="size-4" />
        Retour aux produits
      </Link>

      <div className="mt-3">
        <PageHeader title="Nouveau produit" subtitle="Renseignez la fiche puis publiez-la." />
      </div>

      <ProductForm
        action={createProductAction}
        submitLabel="Creer le produit"
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
          tradeAssurance: false,
          readyToShip: true,
          featured: false,
          active: true,
          specs: [],
        }}
      />
    </div>
  );
}
