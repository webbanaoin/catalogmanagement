import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { shopHoursSchema } from "@/validation/catalog";
export async function GET(_r:Request,c:{params:Promise<{shopId:string}>}) {
 try{const {shopId}=await c.params;await requireShopAccess(shopId);const items=await prisma.shopHour.findMany({where:{shopId},orderBy:{dayOfWeek:"asc"}});return NextResponse.json({items,pagination:{page:1,pageSize:items.length,total:items.length,totalPages:items.length?1:0}})}catch(e){return errorResponse(e)}
}
export async function PUT(r:Request,c:{params:Promise<{shopId:string}>}) {
 try{const {shopId}=await c.params;await requireShopAccess(shopId,{roles:["OWNER","MANAGER"],shopStatuses:["APPROVED","ACTIVE"]});const {hours}=shopHoursSchema.parse(await readJsonBody(r));
 await prisma.$transaction(async tx=>{await tx.shopHour.deleteMany({where:{shopId}});if(hours.length)await tx.shopHour.createMany({data:hours.map(h=>({shopId,dayOfWeek:h.dayOfWeek,isClosed:h.isClosed,openTime:h.isClosed?null:h.openTime,closeTime:h.isClosed?null:h.closeTime}))})});
 const items=await prisma.shopHour.findMany({where:{shopId},orderBy:{dayOfWeek:"asc"}});return NextResponse.json({items});
 }catch(e){return errorResponse(e)}
}
