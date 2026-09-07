import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, LayoutDashboard, MapPin, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/compte", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/compte/commandes", label: "Mes commandes", Icon: Package },
  { href: "/favoris", label: "Mes favoris", Icon: Heart },
  { href: "/compte/adresses", label: "Mes adresses", Icon: MapPin },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?redirectTo=/compte");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="surface-card p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-2">{user.email}</p>
              </div>
            </div>

            <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto border-t border-border pt-3 lg:flex-col">
              {LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>

            <form action={logoutAction} className="mt-3 border-t border-border pt-3">
              <button type="submit" className="btn btn-ghost w-full justify-start text-danger">
                Se deconnecter
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
