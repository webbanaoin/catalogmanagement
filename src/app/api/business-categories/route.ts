import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
export async function GET() {
  try {
    const items = await prisma.businessCategory.findMany({where:{status:"ACTIVE"},orderBy:[{displayOrder:"asc"},{name:"asc"}]});
    return NextResponse.json({items,pagination:{page:1,pageSize:items.length,total:items.length,totalPages:items.length?1:0}});
  } catch(error){ return errorResponse(error); }
}
