"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CreditCard, Loader2, Lock, Wallet } from "lucide-react";
import { placeOrderAction } from "@/app/actions/orders";
import { cn } from "@/lib/format";

/** La valeur envoyee reste le libelle francais : c'est elle qui est stockee. */
const COUNTRIES = ["France", "Belgique", "Suisse", "Luxembourg", "Espagne", "Allemagne"] as const;

const PAYMENTS = [
  { value: "CARD", key: "card", Icon: CreditCard },
  { value: "PAYPAL", key: "paypal", Icon: Wallet },
  { value: "TRANSFER", key: "transfer", Icon: Banknote },
] as const;

export function CheckoutForm({
  defaultAddress,
  userName,
}: {
  userName: string;
  defaultAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    zip: string;
    country: string;
    phone: string | null;
  } | null;
}) {
  const t = useTranslations("checkout");
  const tCountries = useTranslations("countries");
  const tErrors = useTranslations("formErrors");
  const [state, action, pending] = useActionState(placeOrderAction, {});
  const [payment, setPayment] = useState<string>("CARD");

  return (
    <form action={action} className="space-y-5">
      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{t("shippingAddress")}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label={t("fullName")}
            name="fullName"
            defaultValue={defaultAddress?.fullName ?? userName}
            required
          />
          <Field
            label={t("phone")}
            name="phone"
            type="tel"
            defaultValue={defaultAddress?.phone ?? ""}
          />
          <Field
            label={t("address")}
            name="line1"
            defaultValue={defaultAddress?.line1 ?? ""}
            required
            className="sm:col-span-2"
          />
          <Field
            label={t("addressLine2")}
            name="line2"
            defaultValue={defaultAddress?.line2 ?? ""}
            className="sm:col-span-2"
          />
          <Field label={t("postcode")} name="zip" defaultValue={defaultAddress?.zip ?? ""} required />
          <Field label={t("city")} name="city" defaultValue={defaultAddress?.city ?? ""} required />
          <div className="sm:col-span-2">
            <label htmlFor="country" className="label">
              {t("country")}
            </label>
            <select
              id="country"
              name="country"
              defaultValue={defaultAddress?.country ?? "France"}
              className="input"
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {tCountries(country)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            name="saveAddress"
            className="size-4 rounded border-border accent-[var(--primary)]"
          />
          {t("saveAddress")}
        </label>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{t("paymentMethod")}</h2>

        <div className="mt-4 space-y-2">
          {PAYMENTS.map(({ value, key, Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                payment === value ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                checked={payment === value}
                onChange={() => setPayment(value)}
                className="size-4 accent-[var(--primary)]"
              />
              <Icon className={cn("size-5", payment === value ? "text-primary" : "text-muted")} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{t(key)}</span>
                <span className="block text-xs text-muted-2">{t(`${key}Hint`)}</span>
              </span>
            </label>
          ))}
        </div>

        {payment === "CARD" && (
          <div className="mt-4 grid gap-4 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
            <Field
              label={t("cardNumber")}
              name="cardNumber"
              placeholder="4242 4242 4242 4242"
              className="sm:col-span-2"
            />
            <Field label={t("cardExpiry")} name="cardExpiry" placeholder="12/28" />
            <Field label={t("cardCvc")} name="cardCvc" placeholder="123" />
            <p className="text-xs text-muted-2 sm:col-span-2">{t("demoNotice")}</p>
          </div>
        )}
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
        dir={type === "tel" ? "ltr" : undefined}
      />
    </div>
  );
}
