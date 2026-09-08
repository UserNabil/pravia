"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Banknote, Loader2, Lock } from "lucide-react";
import { placeOrderAction } from "@/app/actions/orders";
import { communesForWilayaAction } from "@/app/actions/shipping";
import { cn, formatPrice } from "@/lib/format";
import { LOCALE_TAGS, toLocale } from "@/i18n/routing";

type Wilaya = { code: number; name: string; nameAr: string; shippingFee: number };
type Commune = { name: string; nameAr: string; fee: number };

type Item = {
  id: string;
  quantity: number;
  product: { title: string; price: number; brand: { name: string }; images: { url: string; alt: string }[] };
};

/**
 * Commande en quatre champs : prenom, nom, wilaya, commune.
 *
 * Aucune connexion n'est demandee — le compte ne sert qu'a retrouver ses
 * commandes plus tard. Le recapitulatif est rendu ici plutot que par la page :
 * les frais de livraison dependent de la destination, ils doivent donc se
 * mettre a jour au fil de la saisie.
 */
export function CheckoutForm({
  items,
  subtotal,
  wilayas,
  freeThreshold,
  vatRate,
  defaultFirstName = "",
  defaultLastName = "",
}: {
  items: Item[];
  subtotal: number;
  wilayas: Wilaya[];
  freeThreshold: number;
  vatRate: number;
  defaultFirstName?: string;
  defaultLastName?: string;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("formErrors");
  const locale = toLocale(useLocale());
  const tag = LOCALE_TAGS[locale];
  const arabe = locale === "ar";

  const [state, action, pending] = useActionState(placeOrderAction, {});
  const [wilayaCode, setWilayaCode] = useState<number | null>(null);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [commune, setCommune] = useState<string>("");
  const [chargement, startChargement] = useTransition();

  // Le choix d'une wilaya recharge ses communes et remet a zero la precedente.
  useEffect(() => {
    if (wilayaCode === null) {
      setCommunes([]);
      setCommune("");
      return;
    }
    startChargement(async () => {
      const liste = await communesForWilayaAction(wilayaCode);
      setCommunes(liste);
      setCommune("");
    });
  }, [wilayaCode]);

  const wilaya = wilayas.find((w) => w.code === wilayaCode) ?? null;
  const communeChoisie = communes.find((c) => c.name === commune) ?? null;

  const gratuit = subtotal >= freeThreshold;
  // Tant que la destination n'est pas choisie, aucun montant n'est annonce.
  const fraisConnus = gratuit || communeChoisie !== null;
  const frais = gratuit ? 0 : (communeChoisie?.fee ?? 0);
  const tva = Math.round((subtotal * vatRate) / (1 + vatRate));
  const total = subtotal + frais;

  const nom = (fr: string, ar: string) => (arabe && ar ? ar : fr);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_21rem] lg:items-start">
      <form action={action} className="space-y-5">
        {/* La langue voyage avec le formulaire : une action serveur ne la
            resout pas de maniere fiable, et la confirmation s'affichait dans
            la langue par defaut plutot que celle du visiteur. */}
        <input type="hidden" name="locale" value={locale} />

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("shippingAddress")}</h2>
          <p className="mt-1 text-xs text-muted-2">{t("noAccountNeeded")}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("firstName")} name="firstName" defaultValue={defaultFirstName} required />
            <Field label={t("lastName")} name="lastName" defaultValue={defaultLastName} required />

            <div>
              <label htmlFor="wilayaCode" className="label">
                {t("wilaya")}
                <span className="text-danger"> *</span>
              </label>
              <select
                id="wilayaCode"
                name="wilayaCode"
                required
                value={wilayaCode ?? ""}
                onChange={(e) => setWilayaCode(e.target.value ? Number(e.target.value) : null)}
                className="input"
              >
                <option value="">{t("chooseWilaya")}</option>
                {wilayas.map((w) => (
                  <option key={w.code} value={w.code}>
                    {String(w.code).padStart(2, "0")} — {nom(w.name, w.nameAr)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="commune" className="label">
                {t("commune")}
                <span className="text-danger"> *</span>
              </label>
              <select
                id="commune"
                name="commune"
                required
                disabled={!wilaya || chargement}
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="input disabled:opacity-60"
              >
                <option value="">
                  {!wilaya ? t("chooseWilayaFirst") : chargement ? tCommon("loading") : t("chooseCommune")}
                </option>
                {communes.map((c) => (
                  <option key={c.name} value={c.name}>
                    {nom(c.name, c.nameAr)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-bold">{t("paymentMethod")}</h2>

          {/* Un seul mode de reglement : especes a la livraison. Il n'y a donc
              rien a choisir, et le serveur n'attend aucun champ. */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary bg-primary-soft p-3">
            <Banknote className="size-5 text-primary" />
            <span>
              <span className="block text-sm font-medium">{t("cash")}</span>
              <span className="block text-xs text-muted-2">{t("cashHint")}</span>
            </span>
          </div>
        </section>

        {state.errorKey && (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {tErrors(state.errorKey, state.values)}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 text-sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {t("confirm")}
        </button>
      </form>

      <aside className="surface-card sticky top-32 p-5">
        <h2 className="text-sm font-bold">{t("yourOrder")}</h2>

        <ul className="mt-4 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3 first:pt-0">
              <div className="relative size-14 shrink-0 rounded-lg bg-surface-2 p-1.5">
                {item.product.images[0] && (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.title}
                    width={80}
                    height={80}
                    className="size-full object-contain"
                  />
                )}
                <span className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{item.product.title}</p>
                <p className="mt-0.5 text-xs text-muted-2">{item.product.brand.name}</p>
              </div>
              <p className="shrink-0 text-xs font-semibold tabular-nums">
                {formatPrice(item.product.price * item.quantity, tag)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{tCart("subtotal")}</dt>
            <dd className="tabular-nums">{formatPrice(subtotal, tag)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{tCart("shipping")}</dt>
            <dd
              className={cn(
                !fraisConnus && "text-xs text-muted-2",
                fraisConnus && frais === 0 && "font-semibold text-success",
                fraisConnus && frais > 0 && "tabular-nums"
              )}
            >
              {!fraisConnus
                ? t("shippingPending")
                : frais === 0
                  ? tCommon("free")
                  : formatPrice(frais, tag)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-xs text-muted-2">
            <dt>{tCart("vat")}</dt>
            <dd className="tabular-nums">{formatPrice(tva, tag)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold">
            <dt>{tCart("total")}</dt>
            <dd className="tabular-nums">{formatPrice(total, tag)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}
