import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// One driver adapter, two targets: locally DATABASE_URL is a plain
// "file:./dev.db" path and TURSO_AUTH_TOKEN is unset, so libSQL just opens
// the file directly; in production DATABASE_URL is the Turso database's
// libsql:// URL and TURSO_AUTH_TOKEN is set, so the same client talks to
// Turso over the network instead. Nothing else in the app (or the schema)
// needs to know which one it's doing.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
