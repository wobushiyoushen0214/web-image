import { NextResponse } from "next/server";
import { ENHANCE_MODELS, MODELS, SIZES } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ models: MODELS, sizes: SIZES, enhanceModels: ENHANCE_MODELS });
}
