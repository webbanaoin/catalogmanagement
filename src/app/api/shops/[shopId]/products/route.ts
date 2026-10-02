import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireCategoryInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { productCreateSchema } from "@/validation/catalog";
import { withProductImagesUrls } from "@/server/media/media-response";
import { S3StorageService } from "@/services/storage/s3-storage";
async function uniqueSlug(shopId:string,name:string){const base=toSlug(name);let slug=base,n=2;while(await prisma.product.findUnique({where:{shopId_slug:{shopId,slug}},select:{id:true}})){slug=`${base}-${n++}`}return slug}
export async function GET(r:Request,c:{params:Promise<{shopId:string}>}){try{const {shopId}=await c.params;await requireShopAccess(shopId);const u=new URL(r.url);const page=Math.max(1,Number(u.searchParams.get("page")||1));const pageSize=Math.min(100,Math.max(1,Number(u.searchParams.get("pageSize")||24)));const q=(u.searchParams.get("q")||"").trim();const categoryId=u.searchParams.get("categoryId");const availability=u.searchParams.get("availability");const visibility=u.searchParams.get("visibility");const featured=u.searchParams.get("featured");const newArrival=u.searchParams.get("newArrival");const offer=u.searchParams.get("offer");const deleted=u.searchParams.get("deleted")==="true";
 const where: Prisma.ProductWhereInput={shopId,deletedAt:deleted?{not:null}:null,...(categoryId?{categoryId}:{}),...(availability==="IN_STOCK"||availability==="OUT_OF_STOCK"||availability==="ON_REQUEST"?{availabilityStatus:availability}:{}),...(visibility==="visible"?{isVisible:true}:visibility==="hidden"?{isVisible:false}:{}),...(featured==="true"?{isFeatured:true}:{}),...(newArrival==="true"?{isNewArrival:true}:{}),...(offer==="true"?{isOffer:true}:{}),...(q?{OR:[{name:{contains:q}},{sku:{contains:q}}]}:{})};
 const [items,total]=await prisma.$transaction([prisma.product.findMany({where,include:{category:true,images:{where:{isPrimary:true},take:1}},orderBy:{createdAt:"desc"},skip:(page-1)*pageSize,take:pageSize}),prisma.product.count({where})]);const storage=new S3StorageService();const itemsWithMedia=await Promise.all(items.map(async item=>({...item,images:await withProductImagesUrls(item.images,storage)})));return NextResponse.json({items:itemsWithMedia,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}})}catch(e){return errorResponse(e)}}
export async function POST(r:Request,c:{params:Promise<{shopId:string}>}){try{const {shopId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});const input=productCreateSchema.parse(await readJsonBody(r));if(input.categoryId)await requireCategoryInShop(shopId,input.categoryId);if(input.sku){const duplicate=await prisma.product.findFirst({where:{shopId,sku:input.sku}});if(duplicate)throw new AppError({code:"SKU_CONFLICT",message:"SKU already exists in this shop",status:409});}const {attributes,...product}=input;
 const data=await prisma.product.create({data:{...product,shopId,slug:await uniqueSlug(shopId,input.name),sku:input.sku||null,attributes:{create:attributes}},include:{attributes:true,images:true}});return NextResponse.json({data},{status:201})}catch(e){return errorResponse(e)}}
