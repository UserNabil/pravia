import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/format";

/**
 * Fichiers de marque officiels, servis depuis /public.
 *
 *   logo.png            verrou horizontal complet (2172 x 724)
 *   logo-compact.png    symbole + PRAVIA, decoupes du verrou horizontal (1933 x 521)
 *   logo-principal.png  verrou carre empile (1254 x 1254)
 *   logo-mark.png       symbole seul, decoupe du verrou carre (560 x 651)
 *
 * Le fond est transparent : la marque se pose telle quelle sur les deux
 * themes. Remplacer un fichier suffit a mettre le site a jour.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={560}
      height={651}
      className={cn("h-8 w-auto", className)}
      priority
    />
  );
}

/** Verrou horizontal complet : en-tete large, pied de page, pages d'entree. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Pravia - Mobile Accessories"
      width={2172}
      height={724}
      className={cn("h-12 w-auto", className)}
      priority
    />
  );
}

/** Verrou carre empile : formats hauts, ou la largeur manque. */
export function LogoStacked({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-principal.png"
      alt="Pravia - Mobile Accessories"
      width={1254}
      height={1254}
      className={cn("h-32 w-auto", className)}
    />
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center", className)} aria-label="Pravia">
      {/* Sous 640 px la largeur manque pour le verrou : le symbole seul identifie deja le site. */}
      <Image
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={560}
        height={651}
        className="h-9 w-auto sm:hidden"
        priority
      />
      {/* Les deux baselines deviennent illisibles sous 60 px : l'en-tete garde
          le symbole et le nom, decoupes dans le meme fichier officiel. */}
      <Image
        src="/logo-compact.png"
        alt=""
        aria-hidden="true"
        width={1933}
        height={521}
        className="hidden h-9 w-auto sm:block"
        priority
      />
    </Link>
  );
}
