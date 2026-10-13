import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { assertUniqueCategoryName } from "@/server/catalog/category-name";
import { requireCategoryInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { categoryUpdateSchema } from "@/validation/catalog";

async function ensureParent(shopId:string,id:string,parentId:string|null|undefined){
 if(!parentId)return;if(parentId===id)throw new AppError({code:"INVALID_CATEGORY_PARENT",message:"A category cannot be its own parent",status:409});
 let current:string|null=parentId;const seen=new Set<string>();
 while(current){if(current===id)throw new AppError({code:"INVALID_CATEGORY_PARENT",message:"Category hierarchy cannot contain a cycle",status:409});if(seen.has(current))break;seen.add(current);const p=await requireCategoryInShop(shopId,current);current=p.parentId;}
}
async function uniqueSlug(shopId:string,name:string,id:string){const base=toSlug(name);let slug=base,n=2;while(true){const found=await prisma.shopCategory.findUnique({where:{shopId_slug:{shopId,slug}},select:{id:true}});if(!found||found.id===id)return slug;slug=`${base}-${n++}`}}
export async function GET(_r:Request,c:{params:Promise<{shopId:string,categoryId:string}>}){try{const {shopId,categoryId}=await c.params;await requireShopAccess(shopId);return NextResponse.json({data:await requireCategoryInShop(shopId,categoryId)})}catch(e){return errorResponse(e)}}
export async function PATCH(r:Request,c:{params:Promise<{shopId:string,categoryId:string}>}){try{const {shopId,categoryId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireCategoryInShop(shopId,categoryId);const input=categoryUpdateSchema.parse(await readJsonBody(r));await ensureParent(shopId,categoryId,input.parentId);
 if(input.name)await assertUniqueCategoryName(prisma,{shopId,name:input.name,excludeCategoryId:categoryId});
 const data=await prisma.shopCategory.update({where:{id:categoryId},data:{...input,...(input.name?{slug:await uniqueSlug(shopId,input.name,categoryId)}:{})}});return NextResponse.json({data})}catch(e){return errorResponse(e)}}
export async function DELETE(_r:Request,c:{params:Promise<{shopId:string,categoryId:string}>}){try{const {shopId,categoryId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});await requireCategoryInShop(shopId,categoryId);
 const [children,products]=await Promise.all([prisma.shopCategory.count({where:{parentId:categoryId}}),prisma.product.count({where:{shopId,categoryId,deletedAt:null}})]);if(children||products)throw new AppError({code:"CATEGORY_IN_USE",message:"Move child categories and products before deleting this category",status:409});
 await prisma.shopCategory.delete({where:{id:categoryId}});return NextResponse.json({data:{deleted:true}})}catch(e){return errorResponse(e)}}
