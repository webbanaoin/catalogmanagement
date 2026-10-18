import "server-only";

import { PrismaClient } from "@prisma/client";

import { getDatabaseEnvironment } from "@/server/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  getDatabaseEnvironment();
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// A single Prisma pool per Node.js process is important in production too.
// Next.js route bundles may load this module independently; otherwise each
// route can create another pool and exhaust Railway MySQL connections.
globalForPrisma.prisma = prisma;
