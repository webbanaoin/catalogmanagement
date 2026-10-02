import "server-only";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";

export async function requireCategoryInShop(shopId: string, categoryId: string) {
  const category = await prisma.shopCategory.findFirst({ where: { id: categoryId, shopId } });
  if (!category) throw new AppError({code:"CATEGORY_NOT_FOUND",message:"Category was not found in this shop",status:404});
  return category;
}
export async function requireProductInShop(shopId: string, productId: string, includeDeleted=false) {
  const product = await prisma.product.findFirst({ where: { id: productId, shopId, ...(includeDeleted ? {} : {deletedAt:null}) } });
  if (!product) throw new AppError({code:"PRODUCT_NOT_FOUND",message:"Product was not found in this shop",status:404});
  return product;
}
