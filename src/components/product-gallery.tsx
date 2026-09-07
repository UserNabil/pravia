"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";

export function ProductGallery({
  images,
  title,
}: {
  images: { id: string; url: string; alt: string }[];
  title: string;
}) {
  const t = useTranslations("product");
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="surface-card flex aspect-square items-center justify-center text-sm text-muted-2">
        {t("noImage")}
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={t("imageLabel", { index: index + 1 })}
              aria-current={index === active}
              className={cn(
                "size-16 shrink-0 rounded-xl border bg-surface-2 p-1.5 transition-colors",
                index === active ? "border-primary" : "border-border hover:border-border-strong"
              )}
            >
              <Image src={image.url} alt="" width={80} height={80} className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <div className="surface-card flex-1 bg-surface-2 p-6 sm:p-10">
        <Image
          src={images[active].url}
          alt={images[active].alt || title}
          width={720}
          height={720}
          sizes="(max-width: 1024px) 90vw, 45vw"
          priority
          className="mx-auto aspect-square w-full max-w-md object-contain"
        />
      </div>
    </div>
  );
}
