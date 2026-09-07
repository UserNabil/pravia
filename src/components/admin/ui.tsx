import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/format";
import { ORDER_STATUS_STYLES } from "@/lib/constants";

export function StatCard({
  label,
  value,
  hint,
  trend,
  Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-2">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-[18px]" />
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              trend >= 0 ? "text-success" : "text-danger"
            )}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(trend).toFixed(1)} %
          </span>
        )}
        {hint && <span className="truncate text-muted-2">{hint}</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("orderStatus");
  const known = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  return (
    <span
      className={cn(
        "chip ring-1 ring-inset",
        ORDER_STATUS_STYLES[status] ?? "bg-surface-3 text-muted ring-border"
      )}
    >
      {known.includes(status) ? t(status) : status}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted-2">
        {children}
      </td>
    </tr>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border px-4 py-2.5 text-start text-xs font-semibold text-muted-2",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-4 py-3 align-middle", className)}>{children}</td>;
}

/** Pagination simple utilisee par les tableaux du back-office. */
export function AdminPagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: URLSearchParams;
}) {
  const t = useTranslations("admin.common");
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    return `${basePath}${next.toString() ? `?${next}` : ""}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-xs text-muted-2">{t("pageOf", { page, total: pageCount })}</p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className="btn btn-secondary">
            {t("previous")}
          </Link>
        )}
        {page < pageCount && (
          <Link href={hrefFor(page + 1)} className="btn btn-secondary">
            {t("next")}
          </Link>
        )}
      </div>
    </div>
  );
}
