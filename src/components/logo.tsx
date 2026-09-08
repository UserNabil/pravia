import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/format";

/**
 * Fichiers de marque officiels, servis depuis /public.
 *
 *   logo.png            verrou complet (1212 x 899)
 *   logo-principal.png  meme dessin, formats hauts
 *   logo-mark.png       meme dessin en resolution reduite (720 x 534)
 *   logo-compact.png    meme dessin, emplacements contraints
 *
 * Le logo est toujours montre entier, jamais recadre. Il est presque carre
 * (ratio 1.35) : a hauteur egale il occupe donc trois fois moins de largeur
 * que le verrou horizontal precedent, et son texte reste petit dans l'en-tete.
 * C'est le compromis assume pour ne pas amputer la marque. Un verrou
 * horizontal fourni par le client se substituerait a logo.png sans autre
 * changement que les dimensions ci-dessous.
 *
 * Le fond est transparent : la marque se pose telle quelle sur les deux themes.
 */

/** Dimensions intrinseques, indispensables a next/image pour reserver la place. */
const LOCKUP = { width: 1212, height: 899 };
const MARK = { width: 720, height: 534 };

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={MARK.width}
      height={MARK.height}
      className={cn("h-8 w-auto", className)}
      priority
    />
  );
}

/** Verrou complet : pied de page, pages d'entree. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Pravia - Mobile Accessories"
      width={LOCKUP.width}
      height={LOCKUP.height}
      className={cn("h-16 w-auto", className)}
      priority
    />
  );
}

/** Formats hauts, ou la largeur manque. */
export function LogoStacked({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-principal.png"
      alt="Pravia - Mobile Accessories"
      width={LOCKUP.width}
      height={LOCKUP.height}
      className={cn("h-32 w-auto", className)}
    />
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center", className)} aria-label="Pravia">
      {/* Le verrou complet, au plus grand que permet la rangee de 64 px. Le
          logo etant presque carre, il n'occupe qu'une soixantaine de pixels de
          large : le texte y est petit, mais la marque est montree entiere. */}
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={LOCKUP.width}
        height={LOCKUP.height}
        className="h-11 w-auto sm:h-12"
        priority
      />
    </Link>
  );
}
