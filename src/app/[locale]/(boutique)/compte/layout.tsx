import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirectLocalized } from "@/lib/redirect";
import { Heart, LayoutDashboard, MapPin, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toLocale } from "@/i18n/routing";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/compte", key: "dashboard", Icon: LayoutDashboard },
  { href: "/compte/commandes", key: "myOrders", Icon: Package },
  { href: "/favoris", key: "myFavourites", Icon: Heart },
  { href: "/compte/adresses", key: "myAddresses", Icon: MapPin },
] as const;

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale: rawLocale }, user, t] = await Promise.all([
    params,
    getCurrentUser(),
    getTranslations("account"),
  ]);
  // next-intl exige que chaque mise en page declare sa langue : les segments
  // rendent en parallele, et sans cet appel une mise en page peut lire la
  // langue avant que la racine ne l'ait posee — elle retombe alors sur la
  // langue par defaut, et /fr afficherait de l'arabe.
  setRequestLocale(toLocale(rawLocale));

  if (!user) return redirectLocalized("/connexion?redirectTo=/compte", toLocale(rawLocale));

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
                <p className="truncate text-xs text-muted-2" dir="ltr">{user.email}</p>
              </div>
            </div>

            <nav
              aria-label={t("menu")}
              className="no-scrollbar mt-4 flex gap-1 overflow-x-auto border-t border-border pt-3 lg:flex-col"
            >
              {LINKS.map(({ href, key, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <Icon className="size-4 shrink-0" />
                  {t(key)}
                </Link>
              ))}
            </nav>

            <form action={logoutAction} className="mt-3 border-t border-border pt-3">
              <button type="submit" className="btn btn-ghost w-full justify-start text-danger">
                {t("signOut")}
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
