"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">{t("errorTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-2">{t("errorText")}</p>
      {error.digest && (
        <code className="text-xs text-muted-2">{t("reference", { digest: error.digest })}</code>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RotateCcw className="size-4" />
          {t("retry")}
        </button>
        <Link href="/" className="btn btn-secondary">
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
