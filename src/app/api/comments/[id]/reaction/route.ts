/**
 * POST /api/comments/[id]/reaction
 *
 * Body: { reaction: "like" | "dislike" | null }
 * 注意：null 表示取消反应
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setReaction, CommentError } from "@/lib/comments";
import { codeToStatus } from "../../_helpers";

const bodySchema = z.object({
  reaction: z.enum(["like", "dislike"]).nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数错误", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await setReaction(
      {
        userId: session.user.id,
        trustLevel: session.user.trustLevel,
        isAdmin: session.user.isAdmin,
      },
      id,
      parsed.data.reaction,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CommentError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: codeToStatus(e.code) },
      );
    }
    console.error("setReaction failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
