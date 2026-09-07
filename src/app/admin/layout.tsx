import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s | Back-office Pravia" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/connexion?redirectTo=/admin");
  if (user.role !== "ADMIN") redirect("/compte");

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
