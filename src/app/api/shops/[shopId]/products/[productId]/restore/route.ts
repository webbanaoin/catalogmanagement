import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { errorResponse } from "@/server/http/error-response";
export async function POST(_r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId,true);const data=await prisma.product.update({where:{id:productId},data:{deletedAt:null}});return NextResponse.json({data})}catch(e){return errorResponse(e)}}
