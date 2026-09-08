import "server-only";
import crypto from "node:crypto";

/**
 * Depot des visuels sur Cloudflare R2.
 *
 * R2 expose une API compatible S3. Plutot que d'embarquer le SDK AWS — plusieurs
 * megaoctets pour un seul PUT — on signe la requete a la main : SigV4 tient en
 * une cinquantaine de lignes et n'ajoute aucune dependance au paquet deploye.
 *
 * Les objets sont servis par le domaine public du compartiment, jamais par ce
 * serveur : une fois deposee, une image ne repasse plus jamais par la machine.
 */

export type ConfigR2 = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Domaine public du compartiment, sans barre finale. */
  publicUrl: string;
};

/** Configuration lue dans l'environnement, ou null si R2 n'est pas branche. */
export function configR2(): ConfigR2 | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey, publicUrl };
}

const sha256 = (donnee: string | Buffer) => crypto.createHash("sha256").update(donnee).digest("hex");
const hmac = (cle: crypto.BinaryLike, donnee: string) =>
  crypto.createHmac("sha256", cle).update(donnee).digest();

/**
 * Signature AWS Signature Version 4, telle que R2 l'attend.
 *
 * La region est toujours "auto" chez R2, et le service "s3". La charge utile
 * est hachee : R2 refuse les envois en charge inconnue.
 */
function signer(
  config: ConfigR2,
  methode: string,
  chemin: string,
  octets: Buffer,
  typeContenu: string
): { url: string; entetes: Record<string, string> } {
  const hote = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const maintenant = new Date();
  const horodatage = maintenant.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260908T101500Z
  const jour = horodatage.slice(0, 8);

  const empreinteCharge = sha256(octets);

  const entetes: Record<string, string> = {
    host: hote,
    "content-type": typeContenu,
    "content-length": String(octets.length),
    "x-amz-content-sha256": empreinteCharge,
    "x-amz-date": horodatage,
  };

  const nomsSignes = Object.keys(entetes).sort();
  const entetesCanoniques = nomsSignes.map((n) => `${n}:${entetes[n]}\n`).join("");
  const listeSignee = nomsSignes.join(";");

  const requeteCanonique = [
    methode,
    chemin,
    "", // aucune chaine de requete
    entetesCanoniques,
    listeSignee,
    empreinteCharge,
  ].join("\n");

  const portee = `${jour}/${region}/${service}/aws4_request`;
  const aSigner = [
    "AWS4-HMAC-SHA256",
    horodatage,
    portee,
    sha256(requeteCanonique),
  ].join("\n");

  const cleJour = hmac(`AWS4${config.secretAccessKey}`, jour);
  const cleRegion = hmac(cleJour, region);
  const cleService = hmac(cleRegion, service);
  const cleSignature = hmac(cleService, "aws4_request");
  const signature = crypto.createHmac("sha256", cleSignature).update(aSigner).digest("hex");

  entetes.authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${portee}, ` +
    `SignedHeaders=${listeSignee}, Signature=${signature}`;

  return { url: `https://${hote}${chemin}`, entetes };
}

/** Depose un objet et rend son adresse publique. */
export async function deposerSurR2(
  config: ConfigR2,
  nom: string,
  octets: Buffer,
  typeContenu: string
): Promise<{ ok: true; url: string } | { ok: false; statut: number; message: string }> {
  const chemin = `/${config.bucket}/${nom}`;
  const { url, entetes } = signer(config, "PUT", chemin, octets, typeContenu);

  const reponse = await fetch(url, {
    method: "PUT",
    headers: {
      ...entetes,
      // Le nom derive du contenu : l'objet est immuable, on peut le dire.
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(octets),
  });

  if (!reponse.ok) {
    return { ok: false, statut: reponse.status, message: (await reponse.text()).slice(0, 300) };
  }

  return { ok: true, url: `${config.publicUrl}/${nom}` };
}

/** Verifie que les identifiants et le compartiment repondent. */
export async function verifierR2(config: ConfigR2): Promise<{ ok: boolean; detail: string }> {
  const sonde = Buffer.from("pravia");
  const resultat = await deposerSurR2(config, "verification-pravia.txt", sonde, "text/plain");
  return resultat.ok
    ? { ok: true, detail: resultat.url }
    : { ok: false, detail: `HTTP ${resultat.statut} — ${resultat.message}` };
}
