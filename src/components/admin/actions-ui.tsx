"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/format";

/** Resultat facultatif d'une action : permet d'afficher ce qui s'est reellement passe. */
export type ActionOutcome = void | { message?: string; tone?: "success" | "error" };

/** Bouton declenchant une action serveur apres confirmation explicite. */
export function ConfirmButton({
  action,
  confirmLabel,
  children,
  className,
  successMessage,
}: {
  action: () => Promise<ActionOutcome>;
  confirmLabel: string;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const t = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const toast = useToast();
  const router = useRouter();

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const outcome = await action();
              // L'action peut expliquer ce qu'elle a fait ; sinon on retombe
              // sur le message generique du bouton.
              if (outcome?.message) toast(outcome.message, outcome.tone ?? "success");
              else if (successMessage) toast(successMessage, "success");
              setArmed(false);
              router.refresh();
            })
          }
          className="btn btn-danger px-2.5 py-1 text-xs"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : null}
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="btn btn-ghost px-2 py-1 text-xs"
        >
          {t("cancel")}
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setArmed(true)} className={className}>
      {children}
    </button>
  );
}

/** Interrupteur declenchant une action serveur, avec etat optimiste. */
export function ToggleButton({
  action,
  active,
  labelOn,
  labelOff,
}: {
  action: () => Promise<void>;
  active: boolean;
  labelOn: string;
  labelOff: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(active);
  const router = useRouter();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={optimistic ? labelOn : labelOff}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic((v) => !v);
          await action();
          router.refresh();
        })
      }
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        optimistic ? "bg-success" : "bg-surface-3",
        pending && "opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-all",
          optimistic ? "start-[1.125rem]" : "start-0.5"
        )}
      />
    </button>
  );
}

/** Menu de statut declenchant immediatement l'action serveur. */
export function StatusSelect({
  action,
  value,
  options,
}: {
  action: (status: string) => Promise<void>;
  value: string;
  options: { value: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={current}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setCurrent(next);
          startTransition(async () => {
            await action(next);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
            router.refresh();
          });
        }}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs outline-none transition-colors focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-2" />}
      {saved && !pending && <Check className="size-3.5 text-success" />}
    </span>
  );
}

/** Champ numerique enregistrant au blur (stock inline). */
export function InlineNumber({
  action,
  value,
  min = 0,
}: {
  action: (formData: FormData) => Promise<void>;
  value: number;
  min?: number;
}) {
  const t = useTranslations("admin.products");
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function commit() {
    if (current === value) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("stock", String(current));
      await action(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        value={current}
        disabled={pending}
        onChange={(event) => setCurrent(Number(event.target.value))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label={t("stock")}
        className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs tabular-nums outline-none transition-colors focus:border-primary"
      />
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-2" />}
      {saved && !pending && <Check className="size-3.5 text-success" />}
    </span>
  );
}
