import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";

export async function DELETE(_r:Request,c:{params:Promise<{shopId:string,productId:string,imageId:string}>}){
 try{const {shopId,productId,imageId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId);
 const image=await prisma.productImage.findFirst({where:{id:imageId,productId}});if(!image)throw new AppError({code:"PRODUCT_IMAGE_NOT_FOUND",message:"Product image metadata not found",status:404});
 await prisma.productImage.delete({where:{id:imageId}});return NextResponse.json({data:{deleted:true,storageKey:image.storageKey}});
 }catch(e){return errorResponse(e)}
}
