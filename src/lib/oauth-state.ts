import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { ExternalProfile, ProviderId } from "./oauth";

/**
 * Etat transporte entre le depart et le retour d'une connexion externe.
 *
 * Il voyage dans un cookie signe plutot que dans l'URL : le parametre state
 * renvoye par le fournisseur ne sert qu'a la comparaison, il ne porte aucune
 * donnee exploitable par un tiers.
 */

const FLOW_COOKIE = "pravia_oauth";
const PENDING_COOKIE = "pravia_oauth_pending";
const FLOW_TTL = 60 * 10; // 10 minutes : large pour saisir un mot de passe, court pour un rejeu
const PENDING_TTL = 60 * 20;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET manquant dans l'environnement");
  return new TextEncoder().encode(value);
}

async function sign(payload: Record<string, unknown>, ttl: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

async function read<T>(name: string): Promise<T | null> {
  const store = await cookies();
  const token = store.get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

/** Les cookies du flux suivent le protocole reel, comme celui de session. */
function cookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    // lax est indispensable : Apple revient en POST depuis un autre domaine,
    // et strict effacerait le cookie a ce moment precis.
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}

/* ------------------------------------------------------------ PKCE */

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function createVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(48)));
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(24)));
}

/* -------------------------------------------------------- flux en cours */

export type FlowState = {
  provider: ProviderId;
  state: string;
  verifier: string;
  nonce: string;
  redirectTo: string;
};

export async function startFlow(flow: FlowState, secure: boolean): Promise<void> {
  const store = await cookies();
  store.set(FLOW_COOKIE, await sign(flow, FLOW_TTL), cookieOptions(secure, FLOW_TTL));
}

export async function consumeFlow(): Promise<FlowState | null> {
  const flow = await read<FlowState>(FLOW_COOKIE);
  const store = await cookies();
  // Le cookie est retire des la lecture : un code d'autorisation ne sert
  // qu'une fois, son etat non plus.
  store.delete(FLOW_COOKIE);
  return flow;
}

/* ------------------------------------------- compte en attente d'e-mail */

export type PendingAccount = {
  provider: ProviderId;
  profile: ExternalProfile;
  redirectTo: string;
};

/**
 * TikTok ne communique aucune adresse e-mail. Le compte est mis en attente le
 * temps que l'internaute renseigne la sienne, plutot que d'inventer une
 * adresse factice qui polluerait la base.
 */
export async function holdPending(pending: PendingAccount, secure: boolean): Promise<void> {
  const store = await cookies();
  store.set(
    PENDING_COOKIE,
    await sign(pending as unknown as Record<string, unknown>, PENDING_TTL),
    cookieOptions(secure, PENDING_TTL)
  );
}

export async function peekPending(): Promise<PendingAccount | null> {
  return read<PendingAccount>(PENDING_COOKIE);
}

export async function clearPending(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}
