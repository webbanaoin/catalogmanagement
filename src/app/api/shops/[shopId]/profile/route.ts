import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { shopProfileSchema } from "@/validation/catalog";
import { S3StorageService } from "@/services/storage/s3-storage";

async function mediaUrl(storageKey: string | null): Promise<string | null> {
  if (!storageKey) return null;

  try {
    return await new S3StorageService().getMediaUrl(storageKey);
  } catch {
    return null;
  }
}

export async function GET(_r:Request,c:{params:Promise<{shopId:string}>}) {
  try {
    const {shopId}=await c.params;
    await requireShopAccess(shopId);
    const data=await prisma.shop.findUnique({
      where:{id:shopId},
      include:{businessCategory:true,hours:{orderBy:{dayOfWeek:"asc"}}}
    });
    if(!data) throw new AppError({code:"SHOP_NOT_FOUND",message:"Shop not found",status:404});

    const [logoUrl, coverUrl] = await Promise.all([
      mediaUrl(data.logoStorageKey),
      mediaUrl(data.coverStorageKey),
    ]);

    return NextResponse.json({data:{...data,logoUrl,coverUrl}});
  } catch(e){
    return errorResponse(e);
  }
}

export async function PATCH(r:Request,c:{params:Promise<{shopId:string}>}) {
  try {
    const {shopId}=await c.params;
    await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});
    const input=shopProfileSchema.parse(await readJsonBody(r));
    if(input.businessCategoryId){
      const bc=await prisma.businessCategory.findFirst({where:{id:input.businessCategoryId,status:"ACTIVE"}});
      if(!bc) throw new AppError({code:"BUSINESS_CATEGORY_NOT_FOUND",message:"Business category not found",status:404});
    }
    const data=await prisma.shop.update({where:{id:shopId},data:{...input,email:input.email||null}});
    return NextResponse.json({data});
  } catch(e){
    return errorResponse(e);
  }
}
