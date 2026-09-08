import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LinkedAccounts } from "@/components/linked-accounts";
import { configuredProviders, type ProviderId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("myAddresses"), robots: { index: false, follow: false } };
}

export default async function AddressesPage() {
  const [t, tCheckout, user] = await Promise.all([
    getTranslations("customerAccount"),
    getTranslations("checkout"),
    requireUser(),
  ]);

  const [addresses, profile, accounts] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
    db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, provider: true, email: true, createdAt: true },
    }),
  ]);

  const available = configuredProviders();
  const linkedIds = new Set(accounts.map((a) => a.provider));
  const labels = new Map(available.map((p) => [p.id as string, p.label]));

  // La boutique ne livre qu'en Algerie : seule la wilaya est a nommer, depuis
  // son code officiel conserve sur l'adresse.
  const wilayas = await db.wilaya.findMany({ select: { code: true, name: true } });
  const parCode = new Map(wilayas.map((w) => [w.code, w.name]));
  const wilayaName = (code: number) => parCode.get(code) ?? String(code);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("profileTitle")}</h1>
        <p className="mt-1 text-sm text-muted-2">{t("profileIntro")}</p>
      </div>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{t("profile")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info Icon={User} label={tCheckout("fullName")} value={profile?.name ?? user.name} />
          <Info Icon={Mail} label={t("email")} value={profile?.email ?? user.email} ltr />
          <Info
            Icon={Phone}
            label={tCheckout("phone")}
            value={profile?.phone ?? t("phoneNotSet")}
            ltr={Boolean(profile?.phone)}
          />
        </dl>
      </section>

      <LinkedAccounts
        linked={accounts.map((account) => ({
          id: account.id,
          provider: account.provider as ProviderId,
          label: labels.get(account.provider) ?? account.provider,
          email: account.email,
          createdAt: account.createdAt,
        }))}
        available={available.filter((p) => !linkedIds.has(p.id))}
      />

      <section>
        <h2 className="mb-3 text-base font-bold tracking-tight">
          {t("addressBook", { count: addresses.length })}
        </h2>

        {addresses.length === 0 ? (
          <div className="surface-card px-6 py-12 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
              <MapPin className="size-6" />
            </span>
            <p className="mt-3 text-sm font-medium">{t("noAddressTitle")}</p>
            <p className="mt-1 text-sm text-muted-2">{t("noAddressText")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="surface-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{address.label}</p>
                  {address.isDefault && (
                    <span className="chip bg-primary-soft text-primary">{t("defaultAddress")}</span>
                  )}
                </div>
                <address className="mt-2.5 space-y-0.5 text-sm not-italic text-muted">
                  <p className="font-medium text-foreground">
                    {address.firstName} {address.lastName}
                  </p>
                  <p>{address.commune}</p>
                  <p>
                    {String(address.wilayaCode).padStart(2, "0")}{" "}
                    {wilayaName(address.wilayaCode)}
                  </p>
                </address>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({
  Icon,
  label,
  value,
  ltr,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-2">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium" dir={ltr ? "ltr" : undefined}>
          {value}
        </dd>
      </div>
    </div>
  );
}
