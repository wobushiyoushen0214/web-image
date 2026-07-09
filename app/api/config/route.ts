import { NextResponse } from "next/server";
import { EDIT_MODELS, ENHANCE_MODELS, MODELS, SIZES } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    models: MODELS,
    editModels: EDIT_MODELS,
    sizes: SIZES,
    enhanceModels: ENHANCE_MODELS,
  });
}
