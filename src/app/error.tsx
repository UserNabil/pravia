"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-muted-2">
        Nous n&apos;avons pas pu afficher cette page. Reessayez, ou revenez a l&apos;accueil.
      </p>
      {error.digest && <code className="text-xs text-muted-2">Reference : {error.digest}</code>}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RotateCcw className="size-4" />
          Reessayer
        </button>
        <Link href="/" className="btn btn-secondary">
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
