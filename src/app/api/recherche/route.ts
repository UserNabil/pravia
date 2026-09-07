import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/queries";

/** Autocompletion de la barre de recherche. Lecture seule, aucune donnee privee. */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q") ?? "";

  if (term.trim().length < 2) {
    return NextResponse.json({ products: [], categories: [], brands: [] });
  }

  const { products, categories, brands } = await getSearchSuggestions(term);

  return NextResponse.json(
    {
      products: products.map((product) => ({
        slug: product.slug,
        title: product.title,
        price: product.price,
        brand: product.brand.name,
        category: product.category.name,
        image: product.images[0]?.url ?? null,
      })),
      categories,
      brands,
    },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
