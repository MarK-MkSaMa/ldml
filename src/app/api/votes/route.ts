/**
 * POST /api/votes
 *
 * 提交（或更新）一个维度的评分。
 *
 * Body: { modelId: string, dimensionId: number, score: 1..10 }
 *
 * 需要登录 + trust_level >= 1
 */
import { NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUserFresh } from "@/lib/current-user";
import { castVote, VoteError } from "@/lib/votes";
import { maybePromoteModel } from "@/lib/promotion";

const bodySchema = z.object({
  modelId: z.string().uuid(),
  dimensionId: z.number().int().positive(),
  score: z.number().int().min(1).max(10),
});

export async function POST(req: Request) {
  const user = await getCurrentUserFresh();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (user.trustLevel < 1) {
    return NextResponse.json(
      { error: "信任等级不足，需要 Linux DO 等级 1 及以上" },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数错误", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  try {
    await castVote(
      { userId: user.id, ip, userAgent },
      parsed.data.modelId,
      parsed.data.dimensionId,
      parsed.data.score,
    );
    // 被动晋升检查：如果该模型够格，转 listed
    // 失败不阻塞主流程
    maybePromoteModel(parsed.data.modelId).catch((e) =>
      console.error("[promotion]", e),
    );
    // 让榜单缓存立即失效，下次访问拉到新分数
    updateTag("rankings");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof VoteError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("castVote failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
