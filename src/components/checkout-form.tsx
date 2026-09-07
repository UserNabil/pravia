"use client";

import { useActionState, useState } from "react";
import { Banknote, CreditCard, Loader2, Lock, Wallet } from "lucide-react";
import { placeOrderAction } from "@/app/actions/orders";
import { cn } from "@/lib/format";

const PAYMENTS = [
  { value: "CARD", label: "Carte bancaire", Icon: CreditCard, hint: "Visa, Mastercard, CB" },
  { value: "PAYPAL", label: "PayPal", Icon: Wallet, hint: "Paiement en 4x disponible" },
  { value: "TRANSFER", label: "Virement", Icon: Banknote, hint: "Expedition apres reception" },
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
  const [state, action, pending] = useActionState(placeOrderAction, {});
  const [payment, setPayment] = useState<string>("CARD");

  return (
    <form action={action} className="space-y-5">
      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">Adresse de livraison</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet" name="fullName" defaultValue={defaultAddress?.fullName ?? userName} required />
          <Field label="Telephone" name="phone" type="tel" defaultValue={defaultAddress?.phone ?? ""} />
          <Field
            label="Adresse"
            name="line1"
            defaultValue={defaultAddress?.line1 ?? ""}
            required
            className="sm:col-span-2"
          />
          <Field
            label="Complement d'adresse"
            name="line2"
            defaultValue={defaultAddress?.line2 ?? ""}
            className="sm:col-span-2"
          />
          <Field label="Code postal" name="zip" defaultValue={defaultAddress?.zip ?? ""} required />
          <Field label="Ville" name="city" defaultValue={defaultAddress?.city ?? ""} required />
          <div className="sm:col-span-2">
            <label htmlFor="country" className="label">
              Pays
            </label>
            <select
              id="country"
              name="country"
              defaultValue={defaultAddress?.country ?? "France"}
              className="input"
            >
              {["France", "Belgique", "Suisse", "Luxembourg", "Espagne", "Allemagne"].map((country) => (
                <option key={country}>{country}</option>
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
          Enregistrer cette adresse dans mon carnet
        </label>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">Mode de paiement</h2>

        <div className="mt-4 space-y-2">
          {PAYMENTS.map(({ value, label, Icon, hint }) => (
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
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-2">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        {payment === "CARD" && (
          <div className="mt-4 grid gap-4 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
            <Field
              label="Numero de carte"
              name="cardNumber"
              placeholder="4242 4242 4242 4242"
              className="sm:col-span-2"
            />
            <Field label="Expiration" name="cardExpiry" placeholder="12/28" />
            <Field label="CVC" name="cardCvc" placeholder="123" />
            <p className="text-xs text-muted-2 sm:col-span-2">
              Environnement de demonstration : aucun paiement reel n&apos;est effectue et ces champs ne
              sont pas transmis.
            </p>
          </div>
        )}
      </section>

      {state.error && (
        <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 text-sm">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Confirmer et payer
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
      />
    </div>
  );
}
