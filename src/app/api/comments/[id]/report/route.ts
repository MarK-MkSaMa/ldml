/**
 * POST /api/comments/[id]/report
 *
 * Body: { reason: "spam" | "abuse" | "off_topic" | "other", detail?: string }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { reportComment, CommentError } from "@/lib/comments";
import { codeToStatus } from "../../_helpers";

const bodySchema = z.object({
  reason: z.enum(["spam", "abuse", "off_topic", "other"]),
  detail: z.string().max(500).optional(),
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
    await reportComment(
      {
        userId: session.user.id,
        trustLevel: session.user.trustLevel,
        isAdmin: session.user.isAdmin,
      },
      id,
      parsed.data.reason,
      parsed.data.detail,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CommentError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: codeToStatus(e.code) },
      );
    }
    console.error("reportComment failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
