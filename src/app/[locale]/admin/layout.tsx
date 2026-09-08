import { redirectLocalized } from "@/lib/redirect";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toLocale } from "@/i18n/routing";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.shell");
  return {
    title: { default: t("backoffice"), template: t("titleTemplate") },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale: rawLocale }, user] = await Promise.all([params, getCurrentUser()]);
  // next-intl exige que chaque mise en page declare sa langue : les segments
  // rendent en parallele, et sans cet appel une mise en page peut lire la
  // langue avant que la racine ne l'ait posee — elle retombe alors sur la
  // langue par defaut, et /fr affiche de l'arabe.
  setRequestLocale(toLocale(rawLocale));
  const locale = toLocale(rawLocale);

  if (!user) return redirectLocalized("/connexion?redirectTo=/admin", locale);
  if (user.role !== "ADMIN") return redirectLocalized("/compte", locale);

  const [pendingOrders, pendingReviews] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AdminShell user={user} pendingOrders={pendingOrders} pendingReviews={pendingReviews}>
      {children}
    </AdminShell>
  );
}
