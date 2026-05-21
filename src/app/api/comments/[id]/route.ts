/**
 * PATCH /api/comments/[id]  编辑（仅作者 + 15 分钟内）
 * DELETE /api/comments/[id] 删除（作者或管理员，软删）
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  updateComment,
  deleteComment,
  CommentError,
} from "@/lib/comments";
import { codeToStatus } from "../_helpers";

const patchSchema = z.object({
  content: z.string().min(1).max(3000),
});

async function getCtx() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    trustLevel: session.user.trustLevel,
    isAdmin: session.user.isAdmin,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "参数错误", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await updateComment(ctx, { commentId: id, content: parsed.data.content });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CommentError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: codeToStatus(e.code) },
      );
    }
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("updateComment failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  try {
    await deleteComment(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CommentError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: codeToStatus(e.code) },
      );
    }
    console.error("deleteComment failed:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
