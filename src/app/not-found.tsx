import Link from "next/link";
import { Home, Search } from "lucide-react";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark className="size-12" />
      <p className="text-6xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="text-xl font-bold tracking-tight">Cette page n&apos;existe pas</h1>
      <p className="max-w-sm text-sm text-muted-2">
        Le lien est peut-etre errone, ou le produit a ete retire du catalogue.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className="btn btn-primary">
          <Home className="size-4" />
          Retour a l&apos;accueil
        </Link>
        <Link href="/produits" className="btn btn-secondary">
          <Search className="size-4" />
          Parcourir le catalogue
        </Link>
      </div>
    </div>
  );
}
