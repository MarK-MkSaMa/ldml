/**
 * 评论服务层
 *
 * 业务规则集中在此，被 API 路由和后台审核共同调用。
 *
 * - 一级评论 + 二级回复（嵌套深度最多 2 层）
 * - 1-10 评分外的另一种参与形式
 * - Markdown 渲染并 sanitize（共用 src/lib/markdown.ts）
 * - 软删除：删除时不真的 DELETE，保留楼层结构
 * - 热度排序公式：(likes - dislikes) - hours_since_post / 4
 */
import { db } from "@/db";
import {
  comments,
  commentReactions,
  commentReports,
  bannedKeywords,
  users,
} from "@/db/schema";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { renderMarkdown, assertLength } from "@/lib/markdown";
import { createHash } from "node:crypto";

const CONTENT_MAX = 3000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 3;
const AUTO_HIDE_REPORTS = 5;

export class CommentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "RATE_LIMIT"
      | "INVALID"
      | "BLOCKED_BY_KEYWORD"
      | "EDIT_WINDOW_EXPIRED",
  ) {
    super(message);
  }
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

type Ctx = {
  userId: string;
  trustLevel: number;
  isAdmin: boolean;
  isBanned?: boolean;
  ip?: string | null;
};

// ============================================================
// 关键字过滤
// ============================================================

/**
 * 检查文本是否命中黑名单关键字
 * 返回首个命中的规则；null 表示通过
 */
async function checkKeywords(text: string): Promise<{
  pattern: string;
  action: "block" | "hide";
} | null> {
  const rules = await db.select().from(bannedKeywords);
  for (const r of rules) {
    let hit = false;
    if (r.isRegex) {
      try {
        hit = new RegExp(r.pattern, "i").test(text);
      } catch {
        // 非法正则忽略
      }
    } else {
      hit = text.toLowerCase().includes(r.pattern.toLowerCase());
    }
    if (hit) return { pattern: r.pattern, action: r.action as "block" | "hide" };
  }
  return null;
}

// ============================================================
// 频率限制
// ============================================================

async function ensureRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), gte(comments.createdAt, since)));
  if ((row?.value ?? 0) >= RATE_LIMIT_COUNT) {
    throw new CommentError(
      `发表过于频繁，每分钟最多 ${RATE_LIMIT_COUNT} 条`,
      "RATE_LIMIT",
    );
  }
}

// ============================================================
// 发表 / 编辑 / 删除
// ============================================================

export type CreateCommentInput = {
  modelId: string;
  parentId?: string | null;
  content: string;
};

export async function createComment(
  ctx: Ctx,
  input: CreateCommentInput,
): Promise<{ id: string }> {
  if (ctx.isBanned) throw new CommentError("账号已被封禁", "FORBIDDEN");
  if (ctx.trustLevel < 1) {
    throw new CommentError("Linux DO 信任等级不足（需 1 级以上）", "FORBIDDEN");
  }
  assertLength(input.content, CONTENT_MAX, "评论");

  // 关键字过滤
  const hit = await checkKeywords(input.content);
  if (hit?.action === "block") {
    throw new CommentError(
      `评论包含禁用关键字（${hit.pattern}），已被拒绝`,
      "BLOCKED_BY_KEYWORD",
    );
  }

  // 频率限制
  await ensureRateLimit(ctx.userId);

  // 嵌套深度校验：parent 必须存在且自身不能是回复
  let parentId: string | null = null;
  if (input.parentId) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentId, modelId: comments.modelId })
      .from(comments)
      .where(eq(comments.id, input.parentId));
    if (!parent) throw new CommentError("被回复的评论不存在", "NOT_FOUND");
    if (parent.modelId !== input.modelId) {
      throw new CommentError("被回复的评论不属于该模型", "INVALID");
    }
    if (parent.parentId !== null) {
      throw new CommentError("最多支持两层嵌套，请回复顶级评论", "INVALID");
    }
    parentId = parent.id;
  }

  const html = await renderMarkdown(input.content);

  const [row] = await db
    .insert(comments)
    .values({
      modelId: input.modelId,
      userId: ctx.userId,
      parentId,
      content: input.content,
      contentHtml: html,
      isHidden: hit?.action === "hide", // 命中 hide 规则的写入即隐藏
      ipHash: hashIp(ctx.ip),
    })
    .returning({ id: comments.id });

  return { id: row.id };
}

export type UpdateCommentInput = {
  commentId: string;
  content: string;
};

export async function updateComment(
  ctx: Ctx,
  input: UpdateCommentInput,
): Promise<void> {
  assertLength(input.content, CONTENT_MAX, "评论");

  const [c] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, input.commentId));
  if (!c || c.isDeleted) throw new CommentError("评论不存在", "NOT_FOUND");
  if (c.userId !== ctx.userId) {
    throw new CommentError("只能编辑自己的评论", "FORBIDDEN");
  }
  if (Date.now() - c.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new CommentError("超过编辑窗口（15 分钟）", "EDIT_WINDOW_EXPIRED");
  }

  const hit = await checkKeywords(input.content);
  if (hit?.action === "block") {
    throw new CommentError(
      `评论包含禁用关键字（${hit.pattern}）`,
      "BLOCKED_BY_KEYWORD",
    );
  }

  const html = await renderMarkdown(input.content);
  await db
    .update(comments)
    .set({
      content: input.content,
      contentHtml: html,
      editedAt: new Date(),
      ...(hit?.action === "hide" ? { isHidden: true } : {}),
    })
    .where(eq(comments.id, input.commentId));
}

export async function deleteComment(
  ctx: Ctx,
  commentId: string,
): Promise<void> {
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!c || c.isDeleted) throw new CommentError("评论不存在", "NOT_FOUND");
  if (c.userId !== ctx.userId && !ctx.isAdmin) {
    throw new CommentError("无权删除", "FORBIDDEN");
  }
  await db
    .update(comments)
    .set({ isDeleted: true })
    .where(eq(comments.id, commentId));
}

// ============================================================
// 反应（点赞 / 点踩）
// ============================================================

/**
 * 设置反应
 *   - reaction = "like" / "dislike"：设置或切换为该反应
 *   - reaction = null：取消反应
 *
 * 同步更新 comments.likeCount / dislikeCount
 */
export async function setReaction(
  ctx: Ctx,
  commentId: string,
  reaction: "like" | "dislike" | null,
): Promise<void> {
  if (ctx.isBanned) throw new CommentError("账号已被封禁", "FORBIDDEN");
  if (ctx.trustLevel < 1) {
    throw new CommentError("Linux DO 信任等级不足", "FORBIDDEN");
  }

  const [c] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.isDeleted, false)));
  if (!c) throw new CommentError("评论不存在", "NOT_FOUND");

  const [existing] = await db
    .select()
    .from(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, ctx.userId),
      ),
    );

  if (reaction === null) {
    // 取消
    if (existing) {
      await db
        .delete(commentReactions)
        .where(eq(commentReactions.id, existing.id));
      await recountReactions(commentId);
    }
    return;
  }

  if (existing) {
    if (existing.reaction === reaction) return; // 同样的反应，no-op
    await db
      .update(commentReactions)
      .set({ reaction })
      .where(eq(commentReactions.id, existing.id));
  } else {
    await db.insert(commentReactions).values({
      commentId,
      userId: ctx.userId,
      reaction,
    });
  }
  await recountReactions(commentId);
}

async function recountReactions(commentId: string): Promise<void> {
  const [row] = await db
    .select({
      likes: sql<number>`coalesce(sum(case when reaction = 'like' then 1 else 0 end), 0)::int`,
      dislikes: sql<number>`coalesce(sum(case when reaction = 'dislike' then 1 else 0 end), 0)::int`,
    })
    .from(commentReactions)
    .where(eq(commentReactions.commentId, commentId));
  await db
    .update(comments)
    .set({
      likeCount: row?.likes ?? 0,
      dislikeCount: row?.dislikes ?? 0,
    })
    .where(eq(comments.id, commentId));
}

// ============================================================
// 举报
// ============================================================

export async function reportComment(
  ctx: Ctx,
  commentId: string,
  reason: "spam" | "abuse" | "off_topic" | "other",
  detail?: string,
): Promise<void> {
  if (ctx.isBanned) throw new CommentError("账号已被封禁", "FORBIDDEN");

  const [c] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!c || c.isDeleted) throw new CommentError("评论不存在", "NOT_FOUND");
  if (c.userId === ctx.userId) {
    throw new CommentError("不能举报自己的评论", "FORBIDDEN");
  }

  // 同一用户对同一评论只能举报一次
  try {
    await db.insert(commentReports).values({
      commentId,
      reporterId: ctx.userId,
      reason,
      detail: detail ?? null,
    });
  } catch {
    throw new CommentError("你已举报过此评论", "INVALID");
  }

  // 重算举报数 + 达到阈值自动隐藏
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commentReports)
    .where(eq(commentReports.commentId, commentId));
  const reportCount = row?.count ?? 0;

  await db
    .update(comments)
    .set({
      reportCount,
      ...(reportCount >= AUTO_HIDE_REPORTS && !c.isHidden ? { isHidden: true } : {}),
    })
    .where(eq(comments.id, commentId));
}

// ============================================================
// 列表查询
// ============================================================

export type CommentSort = "hot" | "latest";

export type CommentNode = {
  id: string;
  parentId: string | null;
  content: string;
  contentHtml: string;
  likeCount: number;
  dislikeCount: number;
  isHidden: boolean;
  isDeleted: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    isAdmin: boolean;
  };
  // 当前用户对该评论的反应（请求时附带 userId 才会有）
  myReaction: "like" | "dislike" | null;
  // 嵌套回复（仅顶级评论携带）
  replies?: CommentNode[];
};

/**
 * 查询某模型的评论树
 * - 顶级评论按 sort 排序
 * - 回复内嵌在顶级下，按时间正序
 * - 隐藏 / 删除的评论占位但内容置空，前端决定显示样式
 */
export async function listCommentsForModel(
  modelId: string,
  opts: { sort?: CommentSort; viewerId?: string } = {},
): Promise<CommentNode[]> {
  const sort = opts.sort ?? "hot";

  // 一次查出该 model 的所有评论 + 作者基本信息
  const rows = await db
    .select({
      c: comments,
      u: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
      },
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.modelId, modelId))
    .orderBy(asc(comments.createdAt));

  // 当前用户的反应
  const myReactions = new Map<string, "like" | "dislike">();
  if (opts.viewerId) {
    const ids = rows.map((r) => r.c.id);
    if (ids.length > 0) {
      const reactions = await db
        .select()
        .from(commentReactions)
        .where(eq(commentReactions.userId, opts.viewerId));
      for (const r of reactions) {
        if (ids.includes(r.commentId)) {
          myReactions.set(r.commentId, r.reaction as "like" | "dislike");
        }
      }
    }
  }

  // 隐藏 / 删除：对外暴露占位，内容置空
  const toNode = (r: (typeof rows)[number]): CommentNode => {
    const c = r.c;
    const hiddenOrDeleted = c.isDeleted || c.isHidden;
    return {
      id: c.id,
      parentId: c.parentId,
      content: hiddenOrDeleted ? "" : c.content,
      contentHtml: hiddenOrDeleted ? "" : c.contentHtml,
      likeCount: c.likeCount,
      dislikeCount: c.dislikeCount,
      isHidden: c.isHidden,
      isDeleted: c.isDeleted,
      editedAt: c.editedAt,
      createdAt: c.createdAt,
      author: r.u ?? {
        id: "",
        username: "(unknown)",
        avatarUrl: null,
        isAdmin: false,
      },
      myReaction: myReactions.get(c.id) ?? null,
    };
  };

  const allNodes = rows.map(toNode);
  const topLevel = allNodes.filter((n) => n.parentId === null);
  const repliesByParent = new Map<string, CommentNode[]>();
  for (const n of allNodes) {
    if (n.parentId) {
      const arr = repliesByParent.get(n.parentId) ?? [];
      arr.push(n);
      repliesByParent.set(n.parentId, arr);
    }
  }
  for (const t of topLevel) {
    t.replies = repliesByParent.get(t.id) ?? [];
  }

  // 排序顶级评论
  const sortFn =
    sort === "latest"
      ? (a: CommentNode, b: CommentNode) =>
          b.createdAt.getTime() - a.createdAt.getTime()
      : (a: CommentNode, b: CommentNode) => hotScore(b) - hotScore(a);
  topLevel.sort(sortFn);

  return topLevel;
}

function hotScore(c: CommentNode): number {
  const net = c.likeCount - c.dislikeCount;
  const hours = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60);
  return net - hours / 4;
}

// ============================================================
// 单条查询（编辑窗口判断、举报弹窗等用）
// ============================================================

export async function getCommentById(id: string): Promise<typeof comments.$inferSelect | null> {
  const [row] = await db.select().from(comments).where(eq(comments.id, id));
  return row ?? null;
}

// ============================================================
// 计数（详情页底部"评论 (n)"显示用）
// ============================================================

export async function countCommentsForModel(modelId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.modelId, modelId),
        eq(comments.isDeleted, false),
      ),
    );
  return row?.value ?? 0;
}

// 抑制 unused 警告
void desc;
