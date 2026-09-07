import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export type DatabaseProvider = "sqlite" | "sqlserver";

/** Fournisseur actif : "sqlite" en developpement, "sqlserver" en production. */
export function databaseProvider(): DatabaseProvider {
  return (process.env.DATABASE_PROVIDER ?? "sqlite").toLowerCase() === "sqlserver"
    ? "sqlserver"
    : "sqlite";
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant dans l'environnement.");

  if (databaseProvider() === "sqlserver") {
    // Format Prisma : sqlserver://hote:1433;database=...;user=...;password=...
    return new PrismaClient({ adapter: new PrismaMssql(url) });
  }

  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Client Prisma a instanciation differee.
 *
 * Le client est cree au premier acces, jamais au chargement du module : la
 * compilation de production n'a donc besoin ni d'une base joignable ni d'une
 * chaine de connexion valide, ce qui permet de construire le paquet sur une
 * machine et de le deployer sur une autre.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = client();
    const value = Reflect.get(instance, property, receiver);
    // Les methodes racine ($transaction, $disconnect...) perdraient leur
    // contexte si elles etaient renvoyees telles quelles.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
