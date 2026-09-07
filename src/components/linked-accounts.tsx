"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlink } from "lucide-react";
import { ProviderMark } from "./provider-buttons";
import { unlinkProviderAction } from "@/app/actions/oauth";
import { useToast } from "./toast";
import { formatDate } from "@/lib/format";
import type { ProviderId } from "@/lib/oauth";

export type LinkedAccount = {
  id: string;
  provider: ProviderId;
  label: string;
  email: string | null;
  createdAt: Date;
};

export function LinkedAccounts({
  linked,
  available,
}: {
  linked: LinkedAccount[];
  available: { id: ProviderId; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function unlink(accountId: string) {
    startTransition(async () => {
      const result = await unlinkProviderAction(accountId);
      toast(result.message, result.tone);
      router.refresh();
    });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-bold">Connexions</h2>
      <p className="mt-1 text-xs text-muted-2">
        Liez plusieurs fournisseurs pour vous connecter depuis n&apos;importe quel appareil.
      </p>

      {linked.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {linked.map((account) => (
            <li key={account.id} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                <ProviderMark provider={account.provider} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{account.label}</p>
                <p className="truncate text-xs text-muted-2">
                  {account.email ?? "Aucune adresse transmise"} — lie le{" "}
                  {formatDate(account.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => unlink(account.id)}
                disabled={pending}
                aria-label={`Retirer ${account.label}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted">Ajouter une connexion</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((provider) => (
              <a
                key={provider.id}
                href={`/api/auth/${provider.id}?redirectTo=/compte`}
                className="btn btn-secondary justify-center"
              >
                <ProviderMark provider={provider.id} />
                {provider.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {linked.length === 0 && available.length === 0 && (
        <p className="mt-4 text-sm text-muted-2">
          Aucun fournisseur de connexion n&apos;est active sur ce site.
        </p>
      )}
    </section>
  );
}
