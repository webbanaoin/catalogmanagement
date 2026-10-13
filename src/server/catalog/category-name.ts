import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { AppError } from "@/server/http/app-error";

export function normalizeCategoryName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export async function assertUniqueCategoryName(
  client: Prisma.TransactionClient | PrismaClient,
  options: {
    shopId: string;
    name: string;
    excludeCategoryId?: string;
  },
): Promise<void> {
  const normalized = normalizeCategoryName(options.name);
  const categories = await client.shopCategory.findMany({
    where: {
      shopId: options.shopId,
      ...(options.excludeCategoryId
        ? { id: { not: options.excludeCategoryId } }
        : {}),
    },
    select: { id: true, name: true },
  });

  const duplicate = categories.find(
    (category) => normalizeCategoryName(category.name) === normalized,
  );

  if (duplicate) {
    throw new AppError({
      code: "CATEGORY_NAME_EXISTS",
      message: "A category with this name already exists in this shop",
      status: 409,
      fields: {
        name: ["Use a different category name. Category names are case-insensitive."],
      },
    });
  }
}
