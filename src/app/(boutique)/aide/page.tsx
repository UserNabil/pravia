import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, Mail, Phone, RotateCcw, ShieldCheck, Store, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { buildPageMetadata, faqSchema, jsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("/aide", {
    title: "Centre d'aide - livraison, retours et garanties",
    description:
      "Delais de livraison, retours gratuits sous 30 jours, garanties jusqu'a 24 mois, moyens de paiement et espace vendeur : toutes les reponses.",
  });
}

const SECTIONS = [
  {
    id: "livraison",
    Icon: Truck,
    title: "Livraison et suivi",
    items: [
      [
        "Quels sont les delais de livraison ?",
        "Les commandes validees avant 15 h sont expediees le jour meme pour les produits marques « expedition immediate ». Comptez ensuite 2 a 3 jours ouvres en France metropolitaine, 3 a 5 jours pour la Belgique, la Suisse et le Luxembourg.",
      ],
      [
        "La livraison est-elle offerte ?",
        "Oui, des 150 EUR d'achat. En dessous de ce seuil, un forfait de 9,90 EUR s'applique quel que soit le nombre d'articles.",
      ],
      [
        "Comment suivre mon colis ?",
        "Des l'expedition, un numero de suivi apparait sur la fiche de votre commande, dans « Mon compte » puis « Mes commandes ».",
      ],
    ],
  },
  {
    id: "retours",
    Icon: RotateCcw,
    title: "Retours et remboursements",
    items: [
      [
        "Quel est le delai de retractation ?",
        "Vous disposez de 30 jours a compter de la reception pour changer d'avis, sans avoir a vous justifier. Le produit doit etre complet et dans un etat permettant sa remise en vente.",
      ],
      [
        "Le retour est-il payant ?",
        "Non. Une etiquette prepayee vous est fournie sur simple demande depuis le detail de la commande.",
      ],
      [
        "Sous quel delai suis-je rembourse ?",
        "Le remboursement intervient sous 5 jours ouvres apres reception et controle du produit, sur le moyen de paiement d'origine.",
      ],
    ],
  },
  {
    id: "garantie",
    Icon: ShieldCheck,
    title: "Garanties",
    items: [
      [
        "Quelle garantie s'applique ?",
        "Les produits neufs sont garantis 24 mois piece et main d'oeuvre. Les produits reconditionnes beneficient de la meme garantie de 24 mois ; les produits de seconde main sont couverts 6 mois.",
      ],
      [
        "Qu'est-ce que Trade Assurance ?",
        "C'est notre protection renforcee : le paiement n'est libere au vendeur qu'apres confirmation de la conformite du produit. En cas de litige, Pravia rembourse integralement.",
      ],
      [
        "Que couvre le reconditionnement ?",
        "Chaque appareil reconditionne passe 32 points de controle. La batterie est garantie a plus de 85 % de sa capacite d'origine.",
      ],
    ],
  },
  {
    id: "paiement",
    Icon: CreditCard,
    title: "Paiement",
    items: [
      [
        "Quels moyens de paiement acceptez-vous ?",
        "Carte bancaire (Visa, Mastercard, CB) avec authentification 3D Secure, PayPal, et virement bancaire pour les commandes professionnelles.",
      ],
      [
        "Le paiement en plusieurs fois est-il possible ?",
        "Oui, en 3 ou 4 fois sans frais via PayPal, pour les paniers compris entre 100 et 3000 EUR.",
      ],
    ],
  },
  {
    id: "vendeurs",
    Icon: Store,
    title: "Devenir vendeur",
    items: [
      [
        "Comment rejoindre la marketplace ?",
        "Ecrivez-nous a partenaires@pravia.com avec votre numero SIRET et votre catalogue. Notre equipe revient vers vous sous 48 h ouvrees.",
      ],
      [
        "Quelle commission est prelevee ?",
        "8 % sur le prix de vente hors frais de port, sans abonnement ni frais de mise en ligne.",
      ],
      [
        "Comment sont geres les paiements ?",
        "Les versements sont effectues deux fois par mois, apres expiration du delai de retractation des commandes concernees.",
      ],
    ],
  },
];

export default async function HelpPage() {
  const settings = await db.setting.findMany({
    where: { key: { in: ["store.email", "store.phone"] } },
  });
  const map = new Map(settings.map((row) => [row.key, row.value]));

  const faqEntries = SECTIONS.flatMap((section) =>
    section.items.map(([question, answer]) => ({ question, answer }))
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(faqEntries)) }}
      />
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Centre d&apos;aide</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Livraison, retours, garanties, paiement : retrouvez ici les reponses aux questions les plus
          frequentes. Notre equipe reste joignable 7 jours sur 7.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap justify-center gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="chip border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            <section.Icon className="size-3" />
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-32">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <section.Icon className="size-4" />
              </span>
              {section.title}
            </h2>

            <div className="mt-3 space-y-2">
              {section.items.map(([question, answer]) => (
                <details key={question} className="surface-card group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                    {question}
                    <span className="shrink-0 text-muted-2 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="surface-card mt-10 bg-gradient-to-r from-surface to-primary-soft p-6 text-center">
        <h2 className="text-lg font-bold tracking-tight">Vous n&apos;avez pas trouve votre reponse ?</h2>
        <p className="mt-1.5 text-sm text-muted">
          Notre service client repond du lundi au dimanche, de 9 h a 20 h.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href={`mailto:${map.get("store.email") ?? "contact@pravia.com"}`} className="btn btn-primary">
            <Mail className="size-4" />
            {map.get("store.email") ?? "contact@pravia.com"}
          </a>
          {map.get("store.phone") && (
            <a href={`tel:${map.get("store.phone")}`} className="btn btn-secondary">
              <Phone className="size-4" />
              {map.get("store.phone")}
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-2">
          Vous cherchez un produit ?{" "}
          <Link href="/produits" className="font-medium text-primary hover:underline">
            Parcourir le catalogue
          </Link>
        </p>
      </section>
    </div>
  );
}
