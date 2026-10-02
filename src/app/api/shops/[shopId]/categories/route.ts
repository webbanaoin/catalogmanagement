import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireCategoryInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { categoryCreateSchema } from "@/validation/catalog";

async function uniqueSlug(shopId:string,name:string){const base=toSlug(name);let slug=base,n=2;while(await prisma.shopCategory.findUnique({where:{shopId_slug:{shopId,slug}},select:{id:true}})){slug=`${base}-${n++}`}return slug}

export async function GET(r:Request,c:{params:Promise<{shopId:string}>}){
 try{const {shopId}=await c.params;await requireShopAccess(shopId);const u=new URL(r.url);const page=Math.max(1,Number(u.searchParams.get("page")||1));const pageSize=Math.min(100,Math.max(1,Number(u.searchParams.get("pageSize")||50)));const status=u.searchParams.get("status");
 const where: Prisma.ShopCategoryWhereInput={shopId,...(status==="ACTIVE"||status==="INACTIVE"?{status}: {})};const [items,total]=await prisma.$transaction([prisma.shopCategory.findMany({where,orderBy:[{displayOrder:"asc"},{name:"asc"}],skip:(page-1)*pageSize,take:pageSize}),prisma.shopCategory.count({where})]);
 return NextResponse.json({items,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}})}catch(e){return errorResponse(e)}
}
export async function POST(r:Request,c:{params:Promise<{shopId:string}>}){
 try{const {shopId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});const input=categoryCreateSchema.parse(await readJsonBody(r));if(input.parentId)await requireCategoryInShop(shopId,input.parentId);
 const data=await prisma.shopCategory.create({data:{...input,shopId,slug:await uniqueSlug(shopId,input.name)}});return NextResponse.json({data},{status:201})}catch(e){return errorResponse(e)}
}
