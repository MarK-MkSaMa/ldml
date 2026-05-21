/**
 * POST /api/comments
 *
 * 发表评论或回复
 * Body: { modelId: uuid, parentId?: uuid, content: string }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createComment, CommentError } from "@/lib/comments";
import { codeToStatus } from "./_helpers";

const bodySchema = z.object({
  modelId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().min(1).max(3000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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

  try {
    const result = await createComment(
      {
        userId: session.user.id,
        trustLevel: session.user.trustLevel,
        isAdmin: session.user.isAdmin,
        ip,
      },
      parsed.data,
    );
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if (e instanceof CommentError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: codeToStatus(e.code) },
      );
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("createComment failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
