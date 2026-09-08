import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { saveSettingsAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.settings");
  return { title: t("title") };
}

const DEFAULTS: Record<string, string> = {
  "store.name": "Pravia",
  "store.tagline": "La marketplace du materiel technologique",
  "store.email": "contact@pravia.com",
  "store.phone": "",
  "shipping.freeThreshold": "30000000",
  "banner.text": "",
  "banner.text.fr": "",
  "banner.text.en": "",
  "banner.text.ar": "",
};

export default async function AdminSettingsPage() {
  const [t, rows] = await Promise.all([getTranslations("admin.settings"), db.setting.findMany()]);
  const values = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <SettingsForm action={saveSettingsAction} values={values} />
    </div>
  );
}
