import { getTranslations } from "next-intl/server";

export default async function AdminLoading() {
  const t = await getTranslations("admin.shell");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-[6.5rem] animate-pulse bg-surface-2" />
        ))}
      </div>
      <div className="surface-card h-72 animate-pulse bg-surface-2" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
