import Link from "next/link";
import { CreditCard, Headphones, RotateCcw, Truck } from "lucide-react";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { db } from "@/lib/db";

const GUARANTEES = [
  { Icon: Truck, title: "Livraison offerte", text: "Des 150 EUR d'achat, partout en France" },
  { Icon: RotateCcw, title: "Retours 30 jours", text: "Retour gratuit, remboursement sous 5 jours" },
  { Icon: CreditCard, title: "Paiement securise", text: "3D Secure, paiement en 3x sans frais" },
  { Icon: Headphones, title: "Support 7j/7", text: "Une equipe basee en France, 9h-20h" },
];

const COLUMNS = [
  {
    title: "Acheter",
    links: [
      { href: "/produits", label: "Tout le catalogue" },
      { href: "/produits?tri=best-sellers", label: "Meilleures ventes" },
      { href: "/produits?tri=newest", label: "Nouveautes" },
      { href: "/produits?condition=REFURBISHED", label: "Reconditionne" },
      { href: "/produits?assurance=1", label: "Trade Assurance" },
    ],
  },
  {
    title: "Mon compte",
    links: [
      { href: "/compte", label: "Tableau de bord" },
      { href: "/compte/commandes", label: "Mes commandes" },
      { href: "/favoris", label: "Mes favoris" },
      { href: "/compte/adresses", label: "Mes adresses" },
      { href: "/panier", label: "Mon panier" },
    ],
  },
  {
    title: "Aide",
    links: [
      { href: "/aide", label: "Centre d'aide" },
      { href: "/aide#livraison", label: "Livraison et suivi" },
      { href: "/aide#retours", label: "Retours et remboursements" },
      { href: "/aide#garantie", label: "Garanties" },
      { href: "/aide#vendeurs", label: "Devenir vendeur" },
    ],
  },
];

export async function SiteFooter() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, take: 6 });

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-6">
        <div className="grid gap-6 border-b border-border pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-2">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <LogoMark className="size-7" />
              <span className="font-bold tracking-tight">Pravia</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              La marketplace du materiel technologique. Smartphones, ordinateurs, audio, gaming et
              composants : neufs ou reconditionnes, toujours garantis.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs text-muted-2">Clair / Sombre / Systeme</span>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title}>
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border py-6">
          <span className="text-xs font-medium text-muted-2">Categories :</span>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/produits?categorie=${category.slug}`}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Pravia. Projet de demonstration.</p>
          <p className="flex gap-4">
            <Link href="/aide" className="transition-colors hover:text-foreground">
              Conditions generales
            </Link>
            <Link href="/aide" className="transition-colors hover:text-foreground">
              Confidentialite
            </Link>
            <Link href="/aide" className="transition-colors hover:text-foreground">
              Cookies
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
