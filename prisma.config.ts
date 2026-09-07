import path from "node:path";
import fs from "node:fs";
import { defineConfig, env } from "prisma/config";

// Prisma 7 ne charge plus .env automatiquement.
for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
