import Link from "next/link";
import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRatings } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mes favoris" };

export default async function WishlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Empty
        title="Connectez-vous pour voir vos favoris"
        text="Vos coups de coeur vous suivent sur tous vos appareils."
        href="/connexion?redirectTo=/favoris"
        label="Se connecter"
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
        },
      },
    },
  });

  if (!items.length) {
    return (
      <Empty
        title="Aucun favori pour le moment"
        text="Cliquez sur le coeur d'un produit pour le retrouver ici."
        href="/produits"
        label="Explorer le catalogue"
      />
    );
  }

  const ratings = await getRatings(items.map((item) => item.productId));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Mes favoris <span className="font-normal text-muted-2">({items.length})</span>
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            inWishlist
            product={{
              ...item.product,
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
