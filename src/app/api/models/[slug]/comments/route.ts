/**
 * GET /api/models/[slug]/comments?sort=hot|latest
 *
 * 返回该模型的评论树
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { models } from "@/db/schema";
import { listCommentsForModel } from "@/lib/comments";
import { getCurrentUserFresh } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort");
  const sortKey = sort === "latest" ? "latest" : "hot";

  const [m] = await db
    .select({ id: models.id })
    .from(models)
    .where(eq(models.slug, slug));
  if (!m) return NextResponse.json({ error: "模型不存在" }, { status: 404 });

  const user = await getCurrentUserFresh();
  const tree = await listCommentsForModel(m.id, {
    sort: sortKey,
    viewerId: user?.id,
  });

  return NextResponse.json({ comments: tree });
}
