import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prefer the Prisma Postgres pooler for application queries.
export const db: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_POOLED
        || process.env.PRISMA_DATABASE_URL
        || process.env.POSTGRES_URL
        || process.env.DATABASE_URL
        || process.env.DIRECT_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
