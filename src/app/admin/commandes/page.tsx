import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, StatusBadge, TableShell, Td, Th } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/actions-ui";
import { setOrderStatusAction } from "@/app/actions/admin";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
  value: status,
  label: ORDER_STATUS_LABELS[status],
}));

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (sp.statut) where.status = sp.statut;
  if (sp.q) {
    where.OR = [
      { number: { contains: sp.q } },
      { shipFullName: { contains: sp.q } },
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
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params.set(key, value);
  }

  const counts = new Map(byStatus.map((row) => [row.status, row._count.status]));

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle={`${formatNumber(total)} commande${total > 1 ? "s" : ""} — ${formatPrice(
          revenue._sum.total ?? 0
        )} de volume`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterPill href="/admin/commandes" active={!sp.statut} label="Toutes" count={undefined} />
        {ORDER_STATUSES.map((status) => (
          <FilterPill
            key={status}
            href={`/admin/commandes?statut=${status}`}
            active={sp.statut === status}
            label={ORDER_STATUS_LABELS[status]}
            count={counts.get(status) ?? 0}
          />
        ))}
      </div>

      <form className="surface-card mb-4 flex flex-wrap items-end gap-3 p-3.5">
        {sp.statut && <input type="hidden" name="statut" value={sp.statut} />}
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
              placeholder="Numero, client, e-mail..."
              className="input pl-9"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          Rechercher
        </button>
        {(sp.q || sp.statut) && (
          <Link href="/admin/commandes" className="btn btn-ghost">
            Reinitialiser
          </Link>
        )}
      </form>

      <TableShell>
        <thead>
          <tr>
            <Th>Numero</Th>
            <Th>Client</Th>
            <Th>Date</Th>
            <Th>Articles</Th>
            <Th>Statut</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Detail</Th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && <EmptyRow colSpan={7}>Aucune commande trouvee.</EmptyRow>}

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
                    style={{ backgroundColor: order.user.avatarColor }}
                  >
                    {order.user.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{order.user.name}</p>
                    <p className="truncate text-xs text-muted-2">{order.user.email}</p>
                  </div>
                </div>
              </Td>
              <Td className="whitespace-nowrap text-xs text-muted-2">
                {formatDateTime(order.createdAt)}
              </Td>
              <Td className="tabular-nums text-muted">{order._count.items}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <StatusSelect
                    value={order.status}
                    options={STATUS_OPTIONS}
                    action={async (status: string) => {
                      "use server";
                      await setOrderStatusAction(order.id, status);
                    }}
                  />
                </div>
              </Td>
              <Td className="text-right font-semibold tabular-nums">{formatPrice(order.total)}</Td>
              <Td className="text-right">
                <Link
                  href={`/admin/commandes/${order.id}`}
                  aria-label={`Detail de ${order.number}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  <Eye className="size-3.5" />
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <AdminPagination page={page} pageCount={pageCount} basePath="/admin/commandes" params={params} />
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
