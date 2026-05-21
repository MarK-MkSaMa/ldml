/**
 * 个人中心数据查询
 */
import { db } from "@/db";
import {
  votes,
  comments,
  models,
  dimensions,
} from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export type MyVoteRow = {
  modelId: string;
  modelSlug: string;
  modelName: string;
  modelVendor: string | null;
  dimensionId: number;
  dimensionName: string;
  score: number;
  updatedAt: Date;
};

export type MyCommentRow = {
  id: string;
  modelId: string;
  modelSlug: string;
  modelName: string;
  content: string;
  contentHtml: string;
  isHidden: boolean;
  isDeleted: boolean;
  likeCount: number;
  dislikeCount: number;
  reportCount: number;
  parentId: string | null;
  editedAt: Date | null;
  createdAt: Date;
};

/**
 * 我的所有投票（按更新时间倒序）
 */
export async function getMyVotes(userId: string, limit = 200): Promise<MyVoteRow[]> {
  const rows = await db
    .select({
      modelId: votes.modelId,
      dimensionId: votes.dimensionId,
      score: votes.score,
      updatedAt: votes.updatedAt,
    })
    .from(votes)
    .where(eq(votes.userId, userId))
    .orderBy(desc(votes.updatedAt))
    .limit(limit);

  if (rows.length === 0) return [];

  // 批量取 model / dimension 信息
  const modelIds = [...new Set(rows.map((r) => r.modelId))];
  const dimensionIds = [...new Set(rows.map((r) => r.dimensionId))];

  const [modelInfos, dimInfos] = await Promise.all([
    db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        vendor: models.vendor,
      })
      .from(models)
      .where(inArray(models.id, modelIds)),
    db
      .select({ id: dimensions.id, name: dimensions.name })
      .from(dimensions)
      .where(inArray(dimensions.id, dimensionIds)),
  ]);
  const modelMap = new Map(modelInfos.map((m) => [m.id, m]));
  const dimMap = new Map(dimInfos.map((d) => [d.id, d]));

  return rows.map((r) => {
    const m = modelMap.get(r.modelId);
    const d = dimMap.get(r.dimensionId);
    return {
      modelId: r.modelId,
      modelSlug: m?.slug ?? "",
      modelName: m?.name ?? "(未知模型)",
      modelVendor: m?.vendor ?? null,
      dimensionId: r.dimensionId,
      dimensionName: d?.name ?? "(未知维度)",
      score: r.score,
      updatedAt: r.updatedAt,
    };
  });
}

/**
 * 我的所有评论
 */
export async function getMyComments(
  userId: string,
  limit = 100,
): Promise<MyCommentRow[]> {
  const rows = await db
    .select({
      c: comments,
      m: { id: models.id, slug: models.slug, name: models.name },
    })
    .from(comments)
    .leftJoin(models, eq(models.id, comments.modelId))
    .where(and(eq(comments.userId, userId), eq(comments.isDeleted, false)))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  // 抑制 unused
  void and;

  return rows.map((r) => ({
    id: r.c.id,
    modelId: r.c.modelId,
    modelSlug: r.m?.slug ?? "",
    modelName: r.m?.name ?? "(未知模型)",
    content: r.c.content,
    contentHtml: r.c.contentHtml,
    isHidden: r.c.isHidden,
    isDeleted: r.c.isDeleted,
    likeCount: r.c.likeCount,
    dislikeCount: r.c.dislikeCount,
    reportCount: r.c.reportCount,
    parentId: r.c.parentId,
    editedAt: r.c.editedAt,
    createdAt: r.c.createdAt,
  }));
}
