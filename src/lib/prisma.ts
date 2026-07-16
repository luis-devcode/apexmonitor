import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const cached = globalForPrisma.prisma as (PrismaClient & { comunidadePost?: unknown }) | undefined;

// Em dev, o Next mantem o processo vivo entre reloads. Depois de adicionar um
// model novo no Prisma, a instancia antiga pode ficar presa no global sem os
// delegates novos, como `comunidadePost`.
export const prisma = cached && cached.comunidadePost ? cached : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
