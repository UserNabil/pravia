import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton, InlineNumber, ToggleButton } from "@/components/admin/actions-ui";
import { bulkStockAction, deleteProductAction, toggleProductActiveAction } from "@/app/actions/admin";
import { formatPrice, formatNumber } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; categorie?: string; stock?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [sp, t, tCondition] = await Promise.all([
    searchParams,
    getTranslations("admin.products"),
    getTranslations("condition")
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
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
  const params_ = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params_.set(key, value);
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { count: total })}
        action={
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            <Plus className="size-4" />
            {t("new")}
          </Link>
        }
      />

      <form className="surface-card mb-4 flex flex-wrap items-end gap-3 p-3.5">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="label">
            {t("searchLabel")}
          </label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              id="q"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder={t("searchPlaceholder")}
              className="input ps-9"
            />
          </div>
        </div>

        <div className="w-48">
          <label htmlFor="categorie" className="label">
            {t("category")}
          </label>
          <select id="categorie" name="categorie" defaultValue={sp.categorie ?? ""} className="input">
            <option value="">{t("allCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <label htmlFor="stock" className="label">
            {t("stock")}
          </label>
          <select id="stock" name="stock" defaultValue={sp.stock ?? ""} className="input">
            <option value="">{t("allStock")}</option>
            <option value="faible">{t("stockLow")}</option>
            <option value="rupture">{t("stockOut")}</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          {t("filter")}
        </button>
        {(sp.q || sp.categorie || sp.stock) && (
          <Link href="/admin/produits" className="btn btn-ghost">
            {t("reset")}
          </Link>
        )}
      </form>

      <TableShell>
        <thead>
          <tr>
            <Th>{t("colProduct")}</Th>
            <Th>{t("colCategory")}</Th>
            <Th>{t("colPrice")}</Th>
            <Th>{t("colStock")}</Th>
            <Th>{t("colSold")}</Th>
            <Th>{t("colOnline")}</Th>
            <Th className="text-end">{t("colActions")}</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && <EmptyRow colSpan={7}>{t("empty")}</EmptyRow>}

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
                      {product.condition !== "NEW" && ` — ${tCondition(product.condition)}`}
                    </p>
                  </div>
                </div>
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted">{product.category.name}</Td>
              <Td className="whitespace-nowrap">
                <span className="font-semibold tabular-nums">{formatPrice(product.price, tag)}</span>
                {product.compareAtPrice && (
                  <span className="ms-1.5 text-xs text-muted-2 line-through">
                    {formatPrice(product.compareAtPrice, tag)}
                  </span>
                )}
              </Td>
              <Td>
                <InlineNumber value={product.stock} action={bulkStockAction.bind(null, product.id)} />
              </Td>
              <Td className="tabular-nums text-muted">{formatNumber(product.soldCount, tag)}</Td>
              <Td>
                <ToggleButton
                  active={product.active}
                  action={toggleProductActiveAction.bind(null, product.id)}
                  labelOn={t("unpublish")}
                  labelOff={t("publish")}
                />
              </Td>
              <Td className="text-end">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/produits/${product.id}`}
                    aria-label={t("editAria", { title: product.title })}
                    className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                  <ConfirmButton
                    action={deleteProductAction.bind(null, product.id)}
                    confirmLabel={t("confirmDelete")}
                    successMessage={t("deleted")}
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
        params={params_}
      />
    </div>
  );
}
