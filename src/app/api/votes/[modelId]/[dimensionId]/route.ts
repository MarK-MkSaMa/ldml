/**
 * DELETE /api/votes/[modelId]/[dimensionId]
 *
 * 撤回某个维度的评分
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withdrawVote } from "@/lib/votes";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ modelId: string; dimensionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { modelId, dimensionId } = await params;
  const dimId = Number(dimensionId);
  if (!Number.isInteger(dimId) || dimId <= 0) {
    return NextResponse.json({ error: "维度 ID 非法" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const removed = await withdrawVote(
    { userId: session.user.id, ip, userAgent },
    modelId,
    dimId,
  );
  return NextResponse.json({ ok: true, removed });
}
