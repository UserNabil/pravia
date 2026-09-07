"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2, Star } from "lucide-react";
import { submitReviewAction } from "@/app/actions/orders";
import { cn } from "@/lib/format";

export function ReviewForm({
  productId,
  isAuthenticated,
  existingReview,
  productSlug,
}: {
  productId: string;
  isAuthenticated: boolean;
  productSlug: string;
  existingReview: { rating: number; title: string; body: string; status: string } | null;
}) {
  const t = useTranslations("reviews");
  const tAccount = useTranslations("account");
  const tErrors = useTranslations("formErrors");
  const [state, action, pending] = useActionState(submitReviewAction, {});
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [hover, setHover] = useState(0);

  if (!isAuthenticated) {
    return (
      <div className="surface-card p-5 text-center">
        <p className="text-sm text-muted">{t("signInPrompt")}</p>
        <Link
          href={`/connexion?redirectTo=/produits/${productSlug}`}
          className="btn btn-primary mt-3"
        >
          {tAccount("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="surface-card space-y-4 p-5">
      <div>
        <h3 className="text-sm font-bold">{existingReview ? t("editReview") : t("leaveReview")}</h3>
        {existingReview?.status === "PENDING" && (
          <p className="mt-1 text-xs text-warning">{t("moderation")}</p>
        )}
      </div>

      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <span className="label">{t("yourRating")}</span>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              aria-label={t("stars", { count: value })}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "size-6 transition-colors",
                  (hover || rating) >= value
                    ? "fill-star text-star"
                    : "fill-transparent text-border-strong"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-title" className="label">
          {t("reviewTitle")}
        </label>
        <input
          id="review-title"
          name="title"
          defaultValue={existingReview?.title}
          required
          maxLength={80}
          placeholder={t("titlePlaceholder")}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="label">
          {t("yourReview")}
        </label>
        <textarea
          id="review-body"
          name="body"
          defaultValue={existingReview?.body}
          required
          rows={4}
          maxLength={1200}
          placeholder={t("bodyPlaceholder")}
          className="input resize-y"
        />
      </div>

      {state.errorKey && <p className="text-sm text-danger">{tErrors(state.errorKey)}</p>}
      {state.submitted && <p className="text-sm text-success">{t("submitted")}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {existingReview ? t("update") : t("publish")}
      </button>
    </form>
  );
}
