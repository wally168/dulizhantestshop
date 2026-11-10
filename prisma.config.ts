import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { defineConfig } from "prisma/config";

// Prisma 6 reads these datasource variable names from schema.prisma.
const pooledUrl = process.env.DATABASE_URL_POOLED;
const directUrl = process.env.DIRECT_URL
  || (pooledUrl && process.env.DATABASE_URL)
  || process.env.POSTGRES_URL
  || process.env.DATABASE_URL;
const runtimeUrl = pooledUrl || process.env.PRISMA_DATABASE_URL || directUrl;

if (runtimeUrl) process.env.PRISMA_DATABASE_URL = runtimeUrl;
if (directUrl) process.env.POSTGRES_URL = directUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
