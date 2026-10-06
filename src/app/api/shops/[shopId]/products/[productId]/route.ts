import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireCategoryInShop,requireProductInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { generateProductCode } from "@/server/catalog/product-code";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { productUpdateSchema } from "@/validation/catalog";
import { withProductImagesUrls } from "@/server/media/media-response";
import { S3StorageService } from "@/services/storage/s3-storage";
async function uniqueSlug(shopId:string,name:string,id:string){const base=toSlug(name);let slug=base,n=2;while(true){const f=await prisma.product.findUnique({where:{shopId_slug:{shopId,slug}},select:{id:true}});if(!f||f.id===id)return slug;slug=`${base}-${n++}`}}
export async function GET(_r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId);await requireProductInShop(shopId,productId);const data=await prisma.product.findUnique({where:{id:productId},include:{category:true,attributes:{orderBy:{displayOrder:"asc"}},images:{orderBy:{displayOrder:"asc"}}}});if(!data)throw new AppError({code:"PRODUCT_NOT_FOUND",message:"Product was not found in this shop",status:404});const images=data.images.length===0?[]:await withProductImagesUrls(data.images,new S3StorageService());const responseData={...data,images};return NextResponse.json({data:responseData})}catch(e){return errorResponse(e)}}
export async function PATCH(r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});const existing=await requireProductInShop(shopId,productId);const input=productUpdateSchema.parse(await readJsonBody(r));if(input.categoryId)await requireCategoryInShop(shopId,input.categoryId);
 const effectivePrice=input.price!==undefined?input.price:existing.price==null?null:Number(existing.price);const effectiveDiscount=input.discountPrice!==undefined?input.discountPrice:existing.discountPrice==null?null:Number(existing.discountPrice);
 if(effectivePrice==null&&effectiveDiscount!=null)throw new AppError({code:"VALIDATION_ERROR",message:"Discount price requires a base price",status:400,fields:{discountPrice:["Discount price requires a base price"]}});
 if(effectivePrice!=null&&effectiveDiscount!=null&&effectiveDiscount>effectivePrice)throw new AppError({code:"VALIDATION_ERROR",message:"Discount price cannot exceed price",status:400,fields:{discountPrice:["Discount price cannot exceed price"]}});
 let resolvedSku=existing.sku;
 if(input.sku!==undefined){
   const requestedSku=input.sku?.trim()||null;
   if(requestedSku){
     const duplicate=await prisma.product.findFirst({where:{shopId,sku:requestedSku,id:{not:productId}}});
     if(duplicate)throw new AppError({code:"SKU_CONFLICT",message:"Product code already exists in this shop",status:409});
     resolvedSku=requestedSku;
   }else if(!existing.sku){
     const existingCodes=await prisma.product.findMany({where:{shopId,sku:{not:null}},select:{sku:true}});
     const usedCodes=new Set(existingCodes.map((row)=>row.sku?.trim().toLowerCase()).filter((value):value is string=>Boolean(value)));
     resolvedSku=generateProductCode(usedCodes);
   }
 }
 const {attributes,...product}=input;const data=await prisma.$transaction(async tx=>{if(attributes)await tx.productAttribute.deleteMany({where:{productId}});return tx.product.update({where:{id:productId},data:{...product,...(input.name?{slug:await uniqueSlug(shopId,input.name,productId)}:{}),...(input.sku!==undefined?{sku:resolvedSku}:{}),...(attributes?{attributes:{create:attributes}}:{})},include:{attributes:true,images:true}})});return NextResponse.json({data})}catch(e){return errorResponse(e)}}
export async function DELETE(_r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId);await prisma.product.update({where:{id:productId},data:{deletedAt:new Date(),isVisible:false}});return NextResponse.json({data:{deleted:true}})}catch(e){return errorResponse(e)}}
