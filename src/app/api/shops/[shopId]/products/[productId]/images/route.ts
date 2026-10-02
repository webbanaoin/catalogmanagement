import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { productImageSchema } from "@/validation/catalog";
export async function POST(r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId);const input=productImageSchema.parse(await readJsonBody(r));
 if(!input.storageKey.startsWith(`shops/${shopId}/products/${productId}/`))throw new AppError({code:"INVALID_STORAGE_KEY",message:"Image storage key does not belong to this product",status:400});
 const data=await prisma.$transaction(async tx=>{if(input.isPrimary)await tx.productImage.updateMany({where:{productId},data:{isPrimary:false}});return tx.productImage.create({data:{...input,productId}})});return NextResponse.json({data},{status:201})}catch(e){return errorResponse(e)}}
