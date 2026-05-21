/**
 * 后台评论审核 + 举报队列服务
 */
import { db } from "@/db";
import {
  comments,
  commentReports,
  users,
  models,
} from "@/db/schema";
import { and, desc, eq, sql, inArray } from "drizzle-orm";

// ============================================================
// 评论审核
// ============================================================

export type AdminCommentRow = {
  id: string;
  content: string;
  contentHtml: string;
  modelId: string;
  modelSlug: string;
  modelName: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  authorIsAdmin: boolean;
  likeCount: number;
  dislikeCount: number;
  reportCount: number;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: Date;
};

export type CommentFilter =
  | "all"
  | "hidden"
  | "reported"
  | "deleted";

export async function listCommentsForAdmin(
  filter: CommentFilter = "reported",
  limit = 100,
): Promise<AdminCommentRow[]> {
  const conds = [];
  if (filter === "hidden") conds.push(eq(comments.isHidden, true));
  else if (filter === "reported") conds.push(sql`${comments.reportCount} > 0`);
  else if (filter === "deleted") conds.push(eq(comments.isDeleted, true));

  const rows = await db
    .select({
      c: comments,
      m: { slug: models.slug, name: models.name },
      u: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
      },
    })
    .from(comments)
    .leftJoin(models, eq(models.id, comments.modelId))
    .leftJoin(users, eq(users.id, comments.userId))
    .where(conds.length === 0 ? undefined : and(...conds))
    .orderBy(desc(comments.reportCount), desc(comments.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.c.id,
    content: r.c.content,
    contentHtml: r.c.contentHtml,
    modelId: r.c.modelId,
    modelSlug: r.m?.slug ?? "",
    modelName: r.m?.name ?? "(未知模型)",
    authorId: r.c.userId,
    authorUsername: r.u?.username ?? "(unknown)",
    authorAvatarUrl: r.u?.avatarUrl ?? null,
    authorIsAdmin: r.u?.isAdmin ?? false,
    likeCount: r.c.likeCount,
    dislikeCount: r.c.dislikeCount,
    reportCount: r.c.reportCount,
    isHidden: r.c.isHidden,
    isDeleted: r.c.isDeleted,
    createdAt: r.c.createdAt,
  }));
}

/**
 * 管理员放行被隐藏的评论
 */
export async function unhideCommentAdmin(commentId: string): Promise<void> {
  await db
    .update(comments)
    .set({ isHidden: false })
    .where(eq(comments.id, commentId));
}

/**
 * 管理员强制隐藏
 */
export async function hideCommentAdmin(commentId: string): Promise<void> {
  await db
    .update(comments)
    .set({ isHidden: true })
    .where(eq(comments.id, commentId));
}

/**
 * 管理员软删（与作者自删共用 is_deleted；这里不区分操作来源）
 */
export async function deleteCommentAdmin(commentId: string): Promise<void> {
  await db
    .update(comments)
    .set({ isDeleted: true })
    .where(eq(comments.id, commentId));
}

// ============================================================
// 举报队列
// ============================================================

export type AdminReportRow = {
  id: string;
  commentId: string;
  commentContent: string;
  commentIsHidden: boolean;
  commentIsDeleted: boolean;
  modelSlug: string;
  modelName: string;
  reason: string;
  detail: string | null;
  status: "pending" | "resolved" | "rejected";
  reporterId: string;
  reporterUsername: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  handledAt: Date | null;
};

export type ReportFilter = "pending" | "all" | "resolved" | "rejected";

export async function listReportsForAdmin(
  filter: ReportFilter = "pending",
  limit = 100,
): Promise<AdminReportRow[]> {
  const conds = [];
  if (filter !== "all") {
    conds.push(eq(commentReports.status, filter));
  }

  const reports = await db
    .select()
    .from(commentReports)
    .where(conds.length === 0 ? undefined : and(...conds))
    .orderBy(desc(commentReports.createdAt))
    .limit(limit);

  if (reports.length === 0) return [];

  // 批量查 comment / user / model
  const commentIds = [...new Set(reports.map((r) => r.commentId))];
  const reporterIds = [...new Set(reports.map((r) => r.reporterId))];

  const commentRows = await db
    .select({
      c: comments,
      m: { slug: models.slug, name: models.name },
      u: { id: users.id, username: users.username },
    })
    .from(comments)
    .leftJoin(models, eq(models.id, comments.modelId))
    .leftJoin(users, eq(users.id, comments.userId))
    .where(inArray(comments.id, commentIds));
  const commentMap = new Map(commentRows.map((r) => [r.c.id, r]));

  const reporters = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.id, reporterIds));
  const reporterMap = new Map(reporters.map((r) => [r.id, r]));

  return reports.map((r) => {
    const cr = commentMap.get(r.commentId);
    return {
      id: r.id,
      commentId: r.commentId,
      commentContent: cr?.c.content ?? "",
      commentIsHidden: cr?.c.isHidden ?? false,
      commentIsDeleted: cr?.c.isDeleted ?? false,
      modelSlug: cr?.m?.slug ?? "",
      modelName: cr?.m?.name ?? "(未知模型)",
      reason: r.reason,
      detail: r.detail,
      status: r.status as "pending" | "resolved" | "rejected",
      reporterId: r.reporterId,
      reporterUsername: reporterMap.get(r.reporterId)?.username ?? "(unknown)",
      authorId: cr?.c.userId ?? "",
      authorUsername: cr?.u?.username ?? "(unknown)",
      createdAt: r.createdAt,
      handledAt: r.handledAt,
    };
  });
}

/**
 * 处理举报：resolved 或 rejected
 */
export async function resolveReportAdmin(
  reportId: string,
  handledBy: string,
  status: "resolved" | "rejected",
): Promise<void> {
  await db
    .update(commentReports)
    .set({
      status,
      handledBy,
      handledAt: new Date(),
    })
    .where(eq(commentReports.id, reportId));
}

/**
 * 批量处理某条评论下所有 pending 举报
 * 用于"删了评论 → 自动 resolve 它的所有举报"
 */
export async function resolveAllReportsForComment(
  commentId: string,
  handledBy: string,
  status: "resolved" | "rejected",
): Promise<void> {
  await db
    .update(commentReports)
    .set({
      status,
      handledBy,
      handledAt: new Date(),
    })
    .where(
      and(
        eq(commentReports.commentId, commentId),
        eq(commentReports.status, "pending"),
      ),
    );
}
