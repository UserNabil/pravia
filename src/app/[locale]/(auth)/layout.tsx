import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { ArrowLeft, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const HIGHLIGHTS = [
  { Icon: PackageCheck, key: "aside1" },
  { Icon: Truck, key: "aside2" },
  { Icon: ShieldCheck, key: "aside3" },
] as const;

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // next-intl exige que chaque mise en page declare sa langue : les segments
  // rendent en parallele, et sans cet appel une mise en page peut lire la
  // langue avant que la racine ne l'ait posee — elle retombe alors sur la
  // langue par defaut, et /fr afficherait de l'arabe.
  setRequestLocale(toLocale(locale));

  const t = await getTranslations("auth");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <Link
          href="/"
          className="inline-flex min-h-6 items-center gap-1.5 self-start text-xs text-muted-2 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 rtl:rotate-180" />
          {t("backToShop")}
        </Link>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-background p-12 lg:flex lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 top-1/4 size-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">{t("asideTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("asideText")}</p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ Icon, key }) => (
              <li key={key} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-border">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t(`${key}Title`)}</span>
                  <span className="block text-xs text-muted-2">{t(`${key}Text`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
