import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { saveSettingsAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reglages" };

const DEFAULTS: Record<string, string> = {
  "store.name": "Pravia",
  "store.tagline": "La marketplace du materiel technologique",
  "store.email": "contact@pravia.com",
  "store.phone": "",
  "shipping.freeThreshold": "15000",
  "shipping.flatRate": "990",
  "banner.text": "",
};

export default async function AdminSettingsPage() {
  const rows = await db.setting.findMany();
  const values = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;

  return (
    <div>
      <PageHeader
        title="Reglages"
        subtitle="Parametres generaux de la boutique, appliques immediatement."
      />
      <SettingsForm action={saveSettingsAction} values={values} />
    </div>
  );
}
