import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireCategoryInShop,requireProductInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { productUpdateSchema } from "@/validation/catalog";
async function uniqueSlug(shopId:string,name:string,id:string){const base=toSlug(name);let slug=base,n=2;while(true){const f=await prisma.product.findUnique({where:{shopId_slug:{shopId,slug}},select:{id:true}});if(!f||f.id===id)return slug;slug=`${base}-${n++}`}}
export async function GET(_r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId);await requireProductInShop(shopId,productId);const data=await prisma.product.findUnique({where:{id:productId},include:{category:true,attributes:{orderBy:{displayOrder:"asc"}},images:{orderBy:{displayOrder:"asc"}}}});return NextResponse.json({data})}catch(e){return errorResponse(e)}}
export async function PATCH(r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId);const input=productUpdateSchema.parse(await readJsonBody(r));if(input.categoryId)await requireCategoryInShop(shopId,input.categoryId);const {attributes,...product}=input;
 const data=await prisma.$transaction(async tx=>{if(attributes){await tx.productAttribute.deleteMany({where:{productId}})}return tx.product.update({where:{id:productId},data:{...product,...(input.name?{slug:await uniqueSlug(shopId,input.name,productId)}:{}),...(input.sku!==undefined?{sku:input.sku||null}:{}),...(attributes?{attributes:{create:attributes}}:{})},include:{attributes:true,images:true}})});return NextResponse.json({data})}catch(e){return errorResponse(e)}}
export async function DELETE(_r:Request,c:{params:Promise<{shopId:string,productId:string}>}){try{const {shopId,productId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireProductInShop(shopId,productId);await prisma.product.update({where:{id:productId},data:{deletedAt:new Date(),isVisible:false}});return NextResponse.json({data:{deleted:true}})}catch(e){return errorResponse(e)}}
