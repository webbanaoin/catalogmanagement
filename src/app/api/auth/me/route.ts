import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/error-response";
export async function GET() { try { return NextResponse.json({ data: await requireCurrentUser() }); } catch (error) { return errorResponse(error); } }
