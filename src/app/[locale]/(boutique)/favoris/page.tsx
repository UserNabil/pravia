import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRatings } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { resolveProduct, translationFilter } from "@/lib/content";
import { toLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("favourites");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, t, tAccount, tCatalogue, user] = await Promise.all([
    params,
    getTranslations("favourites"),
    getTranslations("account"),
    getTranslations("catalogue"),
    getCurrentUser(),
  ]);
  const locale = toLocale(rawLocale);

  if (!user) {
    return (
      <Empty
        title={t("signInTitle")}
        text={t("signInText")}
        href="/connexion?redirectTo=/favoris"
        label={tAccount("signIn")}
      />
    );
  }

  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          brand: { select: { name: true, slug: true } },
          category: { select: { name: true, slug: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          translations: translationFilter(locale),
        },
      },
    },
  });

  if (!items.length) {
    return (
      <Empty
        title={t("emptyTitle")}
        text={t("emptyText")}
        href="/produits"
        label={tCatalogue("emptyCta")}
      />
    );
  }

  const ratings = await getRatings(items.map((item) => item.productId));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("title")} <span className="font-normal text-muted-2">({items.length})</span>
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            inWishlist
            product={{
              ...resolveProduct(item.product),
              rating: ratings.get(item.productId)?.average ?? 0,
              reviewCount: ratings.get(item.productId)?.count ?? 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
        <Heart className="size-7" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-2">{text}</p>
      <Link href={href} className="btn btn-primary mt-1">
        {label}
      </Link>
    </div>
  );
}
