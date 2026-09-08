import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Search } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, StatusBadge, TableShell, Td, Th } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/actions-ui";
import { setOrderStatusAction } from "@/app/actions/admin";
import { formatDateTime, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import { ORDER_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [sp, t, tStatus] = await Promise.all([
    searchParams,
    getTranslations("admin.orders"),
    getTranslations("orderStatus")
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
  const statusOptions = ORDER_STATUSES.map((status) => ({ value: status, label: tStatus(status) }));
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (sp.statut) where.status = sp.statut;
  if (sp.q) {
    where.OR = [
      { number: { contains: sp.q } },
      { shipFirstName: { contains: sp.q } },
      { shipLastName: { contains: sp.q } },
      { shipCommune: { contains: sp.q } },
      { shipWilaya: { contains: sp.q } },
      { user: { email: { contains: sp.q } } },
      { user: { name: { contains: sp.q } } },
    ];
  }

  const [orders, total, byStatus, revenue] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { name: true, email: true, avatarColor: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { status: true } }),
    db.order.aggregate({ where, _sum: { total: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const params_ = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params_.set(key, value);
  }

  const counts = new Map(byStatus.map((row) => [row.status, row._count.status]));

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          count: total,
          volume: formatPrice(revenue._sum.total ?? 0, tag),
        })}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterPill href="/admin/commandes" active={!sp.statut} label={t("all")} count={undefined} />
        {ORDER_STATUSES.map((status) => (
          <FilterPill
            key={status}
            href={`/admin/commandes?statut=${status}`}
            active={sp.statut === status}
            label={tStatus(status)}
            count={counts.get(status) ?? 0}
          />
        ))}
      </div>

      <form className="surface-card mb-4 flex flex-wrap items-end gap-3 p-3.5">
        {sp.statut && <input type="hidden" name="statut" value={sp.statut} />}
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
        <button type="submit" className="btn btn-primary">
          {t("submit")}
        </button>
        {(sp.q || sp.statut) && (
          <Link href="/admin/commandes" className="btn btn-ghost">
            {t("reset")}
          </Link>
        )}
      </form>

      <TableShell>
        <thead>
          <tr>
            <Th>{t("colNumber")}</Th>
            <Th>{t("colCustomer")}</Th>
            <Th>{t("colDate")}</Th>
            <Th>{t("colItems")}</Th>
            <Th>{t("colStatus")}</Th>
            <Th className="text-end">{t("colTotal")}</Th>
            <Th className="text-end">{t("colDetail")}</Th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && <EmptyRow colSpan={7}>{t("empty")}</EmptyRow>}

          {orders.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-surface-2">
              <Td>
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {order.number}
                </Link>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
                    style={{ backgroundColor: order.user?.avatarColor ?? "#64748b" }}
                  >
                    {(order.user?.name ?? order.shipFirstName).slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {order.user?.name ?? `${order.shipFirstName} ${order.shipLastName}`}
                    </p>
                    {/* Une commande sans compte n'a pas d'adresse e-mail : on
                        montre la destination, plus utile a la preparation. */}
                    <p className="truncate text-xs text-muted-2" dir={order.user ? "ltr" : undefined}>
                      {order.user?.email ?? `${order.shipCommune}, ${order.shipWilaya}`}
                    </p>
                  </div>
                </div>
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted-2">
                {formatDateTime(order.createdAt, tag)}
              </Td>
              <Td className="tabular-nums text-muted">{order._count.items}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <StatusSelect
                    value={order.status}
                    options={statusOptions}
                    action={async (status: string) => {
                      "use server";
                      await setOrderStatusAction(order.id, status);
                    }}
                  />
                </div>
              </Td>
              <Td className="text-end font-semibold tabular-nums">
                {formatPrice(order.total, tag)}
              </Td>
              <Td className="text-end">
                <Link
                  href={`/admin/commandes/${order.id}`}
                  aria-label={t("detailAria", { number: order.number })}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  <Eye className="size-3.5" />
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <AdminPagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/commandes"
        params={params_}
      />
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`chip border transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && <span className="opacity-70">{count}</span>}
    </Link>
  );
}
