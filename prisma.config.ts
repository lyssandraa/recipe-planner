import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  experimental: { adapter: true },
  engine: "js",
  adapter: async () => {
    return new PrismaLibSql({
      url: process.env.DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  },
});
