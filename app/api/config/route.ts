import { NextResponse } from "next/server";
import { MODELS, SIZES } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ models: MODELS, sizes: SIZES });
}
