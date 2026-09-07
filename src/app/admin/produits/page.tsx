import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton, InlineNumber, ToggleButton } from "@/components/admin/actions-ui";
import { bulkStockAction, deleteProductAction, toggleProductActiveAction } from "@/app/actions/admin";
import { formatPrice, formatNumber } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; stock?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q } },
      { sku: { contains: sp.q } },
      { brand: { name: { contains: sp.q } } },
    ];
  }
  if (sp.categorie) where.category = { slug: sp.categorie };
  if (sp.stock === "faible") where.stock = { lte: 15 };
  if (sp.stock === "rupture") where.stock = 0;

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params.set(key, value);
  }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${formatNumber(total)} produit${total > 1 ? "s" : ""} dans le catalogue`}
        action={
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            <Plus className="size-4" />
            Nouveau produit
          </Link>
        }
      />

      <form className="surface-card mb-4 flex flex-wrap items-end gap-3 p-3.5">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="label">
            Rechercher
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              id="q"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Titre, reference, marque..."
              className="input pl-9"
            />
          </div>
        </div>

        <div className="w-48">
          <label htmlFor="categorie" className="label">
            Categorie
          </label>
          <select id="categorie" name="categorie" defaultValue={sp.categorie ?? ""} className="input">
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <label htmlFor="stock" className="label">
            Stock
          </label>
          <select id="stock" name="stock" defaultValue={sp.stock ?? ""} className="input">
            <option value="">Tous</option>
            <option value="faible">Faible (&lt;= 15)</option>
            <option value="rupture">En rupture</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Filtrer
        </button>
        {(sp.q || sp.categorie || sp.stock) && (
          <Link href="/admin/produits" className="btn btn-ghost">
            Reinitialiser
          </Link>
        )}
      </form>

      <TableShell>
        <thead>
          <tr>
            <Th>Produit</Th>
            <Th>Categorie</Th>
            <Th>Prix</Th>
            <Th>Stock</Th>
            <Th>Vendus</Th>
            <Th>En ligne</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <EmptyRow colSpan={7}>Aucun produit ne correspond a ces criteres.</EmptyRow>
          )}

          {products.map((product) => (
            <tr key={product.id} className="transition-colors hover:bg-surface-2">
              <Td>
                <div className="flex items-center gap-3">
                  <span className="size-10 shrink-0 rounded-lg bg-surface-2 p-1">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        width={48}
                        height={48}
                        className="size-full object-contain"
                      />
                    )}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/produits/${product.id}`}
                      className="block max-w-64 truncate font-medium transition-colors hover:text-primary"
                    >
                      {product.title}
                    </Link>
                    <p className="text-xs text-muted-2">
                      {product.sku} — {product.brand.name}
                      {product.condition !== "NEW" && ` — ${CONDITION_LABELS[product.condition]}`}
                    </p>
                  </div>
                </div>
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted">{product.category.name}</Td>
              <Td className="whitespace-nowrap">
                <span className="font-semibold tabular-nums">{formatPrice(product.price)}</span>
                {product.compareAtPrice && (
                  <span className="ml-1.5 text-xs text-muted-2 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
              </Td>
              <Td>
                <InlineNumber value={product.stock} action={bulkStockAction.bind(null, product.id)} />
              </Td>
              <Td className="tabular-nums text-muted">{formatNumber(product.soldCount)}</Td>
              <Td>
                <ToggleButton
                  active={product.active}
                  action={toggleProductActiveAction.bind(null, product.id)}
                  labelOn="Depublier le produit"
                  labelOff="Publier le produit"
                />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/produits/${product.id}`}
                    aria-label={`Modifier ${product.title}`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                  <ConfirmButton
                    action={deleteProductAction.bind(null, product.id)}
                    confirmLabel="Supprimer"
                    successMessage="Produit supprime."
                    className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <AdminPagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/produits"
        params={params}
      />
    </div>
  );
}
