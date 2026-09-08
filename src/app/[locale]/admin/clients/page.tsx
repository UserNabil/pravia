import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton, StatusSelect } from "@/components/admin/actions-ui";
import { CreateUserPanel } from "@/components/admin/create-user-panel";
import { createUserAction, deleteUserAction, setUserRoleAction } from "@/app/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.customers");
  return { title: t("title") };
}

const PER_PAGE = 15;

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  // La langue est declaree avant toute traduction : getTranslations la lit
  // au moment de son appel, donc l'attendre dans le meme Promise.all que
  // params la ferait retomber sur la langue par defaut.
  setRequestLocale(toLocale(rawLocale));

  const [sp, t, currentAdmin] = await Promise.all([
    searchParams,
    getTranslations("admin.customers"),
    getCurrentUser()
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
  const roleOptions = [
    { value: "CUSTOMER", label: t("roleCustomer") },
    { value: "ADMIN", label: t("roleAdmin") },
  ];
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

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
  const params_ = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params_.set(key, value);
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle", { count: total })} />

      <div className="grid gap-5 xl:grid-cols-[1fr_19rem] xl:items-start">
        <div>
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
            <div className="w-44">
              <label htmlFor="role" className="label">
                {t("role")}
              </label>
              <select id="role" name="role" defaultValue={sp.role ?? ""} className="input">
                <option value="">{t("allRoles")}</option>
                <option value="CUSTOMER">{t("roleCustomers")}</option>
                <option value="ADMIN">{t("roleAdmins")}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              {t("filter")}
            </button>
            {(sp.q || sp.role) && (
              <Link href="/admin/clients" className="btn btn-ghost">
                {t("reset")}
              </Link>
            )}
          </form>

          <TableShell>
            <thead>
              <tr>
                <Th>{t("colCustomer")}</Th>
                <Th>{t("colSignedUp")}</Th>
                <Th>{t("colOrders")}</Th>
                <Th>{t("colSpent")}</Th>
                <Th>{t("colRole")}</Th>
                <Th className="text-end">{t("colActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <EmptyRow colSpan={6}>{t("empty")}</EmptyRow>}

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
                            {isSelf && (
                              <span className="ms-1.5 text-xs text-muted-2">{t("you")}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-2" dir="ltr">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-2">
                      {formatDate(user.createdAt, tag)}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/commandes?q=${encodeURIComponent(user.email)}`}
                        className="tabular-nums text-primary hover:underline"
                      >
                        {user._count.orders}
                      </Link>
                    </Td>
                    <Td className="font-semibold tabular-nums">{formatPrice(spent, tag)}</Td>
                    <Td>
                      {isSelf ? (
                        <span className="chip bg-primary-soft text-primary">{t("roleAdmin")}</span>
                      ) : (
                        <StatusSelect
                          value={user.role}
                          options={roleOptions}
                          action={async (role: string) => {
                            "use server";
                            await setUserRoleAction(user.id, role);
                          }}
                        />
                      )}
                    </Td>
                    <Td className="text-end">
                      {isSelf ? (
                        <span className="text-xs text-muted-2">—</span>
                      ) : (
                        <ConfirmButton
                          action={deleteUserAction.bind(null, user.id)}
                          confirmLabel={t("confirmDelete")}
                          className="ms-auto flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
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

          <AdminPagination
            page={page}
            pageCount={pageCount}
            basePath="/admin/clients"
            params={params_}
          />
        </div>

        <CreateUserPanel action={createUserAction} />
      </div>
    </div>
  );
}
