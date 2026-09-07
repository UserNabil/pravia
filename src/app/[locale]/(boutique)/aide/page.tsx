import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreditCard, Mail, Phone, RotateCcw, ShieldCheck, Store, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { buildPageMetadata, faqSchema, jsonLd } from "@/lib/seo";
import { toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "help" });

  return buildPageMetadata("/aide", locale, {
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** L'ancre reste en francais : elle est partagee et indexee telle quelle. */
const SECTIONS = [
  { id: "livraison", key: "shipping", Icon: Truck, questions: 3 },
  { id: "retours", key: "returns", Icon: RotateCcw, questions: 3 },
  { id: "garantie", key: "warranty", Icon: ShieldCheck, questions: 3 },
  { id: "paiement", key: "payment", Icon: CreditCard, questions: 2 },
  { id: "vendeurs", key: "sellers", Icon: Store, questions: 3 },
] as const;

export default async function HelpPage() {
  const [t, settings] = await Promise.all([
    getTranslations("help"),
    db.setting.findMany({ where: { key: { in: ["store.email", "store.phone"] } } }),
  ]);
  const map = new Map(settings.map((row) => [row.key, row.value]));

  const sections = SECTIONS.map((section) => ({
    ...section,
    title: t(`${section.key}.title`),
    items: Array.from({ length: section.questions }, (_, index) => ({
      question: t(`${section.key}.q${index + 1}`),
      answer: t(`${section.key}.a${index + 1}`),
    })),
  }));

  const faqEntries = sections.flatMap((section) => section.items);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(faqEntries)) }}
      />
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("intro")}</p>
      </div>

      <nav className="mt-6 flex flex-wrap justify-center gap-2">
        {sections.map((section) => (
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
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-32">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <section.Icon className="size-4" />
              </span>
              {section.title}
            </h2>

            <div className="mt-3 space-y-2">
              {section.items.map((item) => (
                <details key={item.question} className="surface-card group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                    {item.question}
                    <span className="shrink-0 text-muted-2 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="surface-card mt-10 bg-gradient-to-r from-surface to-primary-soft p-6 text-center">
        <h2 className="text-lg font-bold tracking-tight">{t("notFoundTitle")}</h2>
        <p className="mt-1.5 text-sm text-muted">{t("notFoundText")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a
            href={`mailto:${map.get("store.email") ?? "contact@pravia.com"}`}
            className="btn btn-primary"
            dir="ltr"
          >
            <Mail className="size-4" />
            {map.get("store.email") ?? "contact@pravia.com"}
          </a>
          {map.get("store.phone") && (
            <a href={`tel:${map.get("store.phone")}`} className="btn btn-secondary" dir="ltr">
              <Phone className="size-4" />
              {map.get("store.phone")}
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-2">
          {t("browseCatalogue")}{" "}
          <Link href="/produits" className="font-medium text-primary hover:underline">
            {t("browseCatalogueLink")}
          </Link>
        </p>
      </section>
    </div>
  );
}
