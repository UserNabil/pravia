import Link from "next/link";
import { Search, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton, StatusSelect } from "@/components/admin/actions-ui";
import { CreateUserPanel } from "@/components/admin/create-user-panel";
import { createUserAction, deleteUserAction, setUserRoleAction } from "@/app/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clients" };

const PER_PAGE = 15;

const ROLE_OPTIONS = [
  { value: "CUSTOMER", label: "Client" },
  { value: "ADMIN", label: "Administrateur" },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const currentAdmin = await getCurrentUser();

  const where: Prisma.UserWhereInput = {};
  if (sp.role) where.role = sp.role;
  if (sp.q) {
    where.OR = [{ name: { contains: sp.q } }, { email: { contains: sp.q } }];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        _count: { select: { orders: true, reviews: true } },
        orders: { select: { total: true, status: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params.set(key, value);
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${formatNumber(total)} compte${total > 1 ? "s" : ""}`} />

      <div className="grid gap-5 xl:grid-cols-[1fr_19rem] xl:items-start">
        <div>
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
                  placeholder="Nom ou e-mail..."
                  className="input pl-9"
                />
              </div>
            </div>
            <div className="w-44">
              <label htmlFor="role" className="label">
                Role
              </label>
              <select id="role" name="role" defaultValue={sp.role ?? ""} className="input">
                <option value="">Tous</option>
                <option value="CUSTOMER">Clients</option>
                <option value="ADMIN">Administrateurs</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Filtrer
            </button>
            {(sp.q || sp.role) && (
              <Link href="/admin/clients" className="btn btn-ghost">
                Reinitialiser
              </Link>
            )}
          </form>

          <TableShell>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Inscrit le</Th>
                <Th>Commandes</Th>
                <Th>Total depense</Th>
                <Th>Role</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <EmptyRow colSpan={6}>Aucun compte trouve.</EmptyRow>}

              {users.map((user) => {
                const spent = user.orders
                  .filter((order) => ["PAID", "SHIPPED", "DELIVERED"].includes(order.status))
                  .reduce((sum, order) => sum + order.total, 0);
                const isSelf = user.id === currentAdmin?.id;

                return (
                  <tr key={user.id} className="transition-colors hover:bg-surface-2">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.name}
                            {isSelf && <span className="ml-1.5 text-xs text-muted-2">(vous)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-2">{user.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-2">
                      {formatDate(user.createdAt)}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/commandes?q=${encodeURIComponent(user.email)}`}
                        className="tabular-nums text-primary hover:underline"
                      >
                        {user._count.orders}
                      </Link>
                    </Td>
                    <Td className="font-semibold tabular-nums">{formatPrice(spent)}</Td>
                    <Td>
                      {isSelf ? (
                        <span className="chip bg-primary-soft text-primary">Administrateur</span>
                      ) : (
                        <StatusSelect
                          value={user.role}
                          options={ROLE_OPTIONS}
                          action={async (role: string) => {
                            "use server";
                            await setUserRoleAction(user.id, role);
                          }}
                        />
                      )}
                    </Td>
                    <Td className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-2">—</span>
                      ) : (
                        <ConfirmButton
                          action={deleteUserAction.bind(null, user.id)}
                          confirmLabel="Supprimer"
                          successMessage="Compte supprime."
                          className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </ConfirmButton>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>

          <AdminPagination page={page} pageCount={pageCount} basePath="/admin/clients" params={params} />
        </div>

        <CreateUserPanel action={createUserAction} />
      </div>
    </div>
  );
}
