import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { enregistrerMedia, TAILLE_MAX, typesAcceptes } from "@/lib/media";

/**
 * Depot d'un visuel depuis le back-office.
 *
 * Un gestionnaire de route plutot qu'une action serveur : celles-ci sont
 * plafonnees a 4 Mo de corps de requete, ce qui refuserait une photo produit
 * ordinaire. Ici le fichier est lu en flux et la limite est la notre.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ erreur: "refuse" }, { status: 403 });
  }

  let formulaire: FormData;
  try {
    formulaire = await request.formData();
  } catch {
    return NextResponse.json({ erreur: "illisible" }, { status: 400 });
  }

  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ erreur: "vide" }, { status: 400 });
  }

  const resultat = await enregistrerMedia(fichier);

  if (!resultat.ok) {
    const statut = resultat.erreur === "taille" ? 413 : 415;
    return NextResponse.json(
      { erreur: resultat.erreur, tailleMax: TAILLE_MAX, types: typesAcceptes() },
      { status: statut }
    );
  }

  return NextResponse.json({ url: resultat.url, taille: resultat.taille });
}
