import { NextResponse } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { env } from "@/env";
import { syncModelsFromModelsDev } from "@/lib/models-dev-sync";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  if (!env.MODELS_SYNC_SECRET) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${env.MODELS_SYNC_SECRET}`;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const result = await syncModelsFromModelsDev();
    revalidatePath("/admin/models");
    revalidatePath("/", "layout");
    updateTag("rankings");
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("models.dev sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
