import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Check, Trash2, X } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPagination, EmptyRow, PageHeader, TableShell, Td, Th } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/actions-ui";
import { Stars } from "@/components/stars";
import { deleteReviewAction, moderateReviewAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.reviews");
  return { title: t("title") };
}

/** Statuts de moderation, dans l'ordre d'affichage des filtres. */
const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "REJECTED"] as const;

const PER_PAGE = 15;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  PUBLISHED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

export default async function AdminReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ statut?: string; page?: string }>;
}) {
  const [{ locale: rawLocale }, sp, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin.reviews"),
  ]);
  const tag = LOCALE_TAGS[toLocale(rawLocale)];
  const statusLabel = (status: string) =>
    t(`status${status.charAt(0)}${status.slice(1).toLowerCase()}`);
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.ReviewWhereInput = sp.statut ? { status: sp.statut } : {};

  const [reviews, total, counts] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { name: true, email: true, avatarColor: true } },
        product: { select: { title: true, slug: true } },
      },
    }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const params_ = new URLSearchParams();
  if (sp.statut) params_.set("statut", sp.statut);

  const countMap = new Map(counts.map((row) => [row.status, row._count.status]));

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { count: total })}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Pill href="/admin/avis" active={!sp.statut} label={t("all")} />
        {REVIEW_STATUSES.map((status) => (
          <Pill
            key={status}
            href={`/admin/avis?statut=${status}`}
            active={sp.statut === status}
            label={statusLabel(status)}
            count={countMap.get(status) ?? 0}
          />
        ))}
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>{t("colReview")}</Th>
            <Th>{t("colProduct")}</Th>
            <Th>{t("colAuthor")}</Th>
            <Th>{t("colStatus")}</Th>
            <Th className="text-end">{t("colModeration")}</Th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 && <EmptyRow colSpan={5}>{t("empty")}</EmptyRow>}

          {reviews.map((review) => (
            <tr key={review.id} className="transition-colors hover:bg-surface-2">
              <Td className="max-w-md">
                <Stars rating={review.rating} size="xs" />
                <p className="mt-1 text-sm font-medium">{review.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{review.body}</p>
                <p className="mt-1 text-xs text-muted-2">{formatDate(review.createdAt, tag)}</p>
              </Td>
              <Td>
                <Link
                  href={`/produits/${review.product.slug}`}
                  className="line-clamp-2 max-w-40 text-xs text-primary hover:underline"
                >
                  {review.product.title}
                </Link>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
                    style={{ backgroundColor: review.user.avatarColor }}
                  >
                    {review.user.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{review.user.name}</p>
                    <p className="truncate text-xs text-muted-2" dir="ltr">
                      {review.user.email}
                    </p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className={`chip ${STATUS_STYLES[review.status]}`}>
                  {statusLabel(review.status)}
                </span>
              </Td>
              <Td className="text-end">
                <div className="flex items-center justify-end gap-1">
                  {review.status !== "PUBLISHED" && (
                    <ModerateButton
                      reviewId={review.id}
                      status="PUBLISHED"
                      label={t("publish")}
                      className="text-success hover:bg-success/10"
                    >
                      <Check className="size-3.5" />
                    </ModerateButton>
                  )}
                  {review.status !== "REJECTED" && (
                    <ModerateButton
                      reviewId={review.id}
                      status="REJECTED"
                      label={t("reject")}
                      className="text-warning hover:bg-warning/10"
                    >
                      <X className="size-3.5" />
                    </ModerateButton>
                  )}
                  <ConfirmButton
                    action={deleteReviewAction.bind(null, review.id)}
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

      <AdminPagination page={page} pageCount={pageCount} basePath="/admin/avis" params={params_} />
    </div>
  );
}

function ModerateButton({
  reviewId,
  status,
  label,
  className,
  children,
}: {
  reviewId: string;
  status: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={moderateReviewAction.bind(null, reviewId, status)}>
      <button
        type="submit"
        title={label}
        aria-label={label}
        className={`flex size-8 items-center justify-center rounded-lg transition-colors ${className}`}
      >
        {children}
      </button>
    </form>
  );
}

function Pill({
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
