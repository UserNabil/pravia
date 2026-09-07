import Link from "next/link";
import { ArrowLeft, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const HIGHLIGHTS = [
  { Icon: PackageCheck, title: "40 references selectionnees", text: "Neuf et reconditionne garanti" },
  { Icon: Truck, title: "Livraison offerte des 150 EUR", text: "Expedition sous 24 h" },
  { Icon: ShieldCheck, title: "Trade Assurance", text: "Conforme ou rembourse" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
          className="inline-flex items-center gap-1.5 self-start text-xs text-muted-2 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour a la boutique
        </Link>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-background p-12 lg:flex lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-1/4 size-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            La marketplace du materiel technologique.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Creez votre compte pour suivre vos commandes, enregistrer vos favoris et retrouver votre
            panier sur tous vos appareils.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-border">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-muted-2">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
