import { NextResponse } from "next/server";
import { lireMedia } from "@/lib/media";

/**
 * Sert les visuels televerses depuis le back-office.
 *
 * Le nom de fichier derive du contenu : une adresse donnee designe toujours le
 * meme octet, ce qui autorise un cache immuable d'un an. Cloudflare garde donc
 * ces images en peripherie et le serveur ne les resert qu'une fois.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fichier: string }> }
) {
  const { fichier } = await params;
  const media = await lireMedia(fichier);

  if (!media) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.octets), {
    headers: {
      "Content-Type": media.type,
      "Content-Length": String(media.octets.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Un SVG televerse peut porter du script : servi en piece jointe pour le
      // navigateur direct, il reste affichable via <img> et next/image.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
