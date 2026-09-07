import type { Metadata } from "next";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes adresses",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const user = await requireUser();

  const [addresses, profile] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes informations</h1>
        <p className="mt-1 text-sm text-muted-2">
          Vos coordonnees et le carnet d&apos;adresses utilise au moment de la commande.
        </p>
      </div>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">Profil</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info Icon={User} label="Nom complet" value={profile?.name ?? user.name} />
          <Info Icon={Mail} label="Adresse e-mail" value={profile?.email ?? user.email} />
          <Info Icon={Phone} label="Telephone" value={profile?.phone ?? "Non renseigne"} />
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold tracking-tight">
          Carnet d&apos;adresses ({addresses.length})
        </h2>

        {addresses.length === 0 ? (
          <div className="surface-card px-6 py-12 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
              <MapPin className="size-6" />
            </span>
            <p className="mt-3 text-sm font-medium">Aucune adresse enregistree</p>
            <p className="mt-1 text-sm text-muted-2">
              Cochez « Enregistrer cette adresse » lors de votre prochaine commande pour la
              retrouver ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="surface-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{address.label}</p>
                  {address.isDefault && (
                    <span className="chip bg-primary-soft text-primary">Par defaut</span>
                  )}
                </div>
                <address className="mt-2.5 space-y-0.5 text-sm not-italic text-muted">
                  <p className="font-medium text-foreground">{address.fullName}</p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.zip} {address.city}
                  </p>
                  <p>{address.country}</p>
                  {address.phone && <p className="pt-1">{address.phone}</p>}
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
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-2">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}
