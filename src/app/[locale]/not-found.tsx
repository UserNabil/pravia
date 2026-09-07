import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Home, Search } from "lucide-react";
import { LogoMark } from "@/components/logo";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark className="h-12" />
      <p className="text-6xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="text-xl font-bold tracking-tight">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-2">{t("notFoundText")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className="btn btn-primary">
          <Home className="size-4" />
          {t("backHome")}
        </Link>
        <Link href="/produits" className="btn btn-secondary">
          <Search className="size-4" />
          {t("browseCatalogue")}
        </Link>
      </div>
    </div>
  );
}
