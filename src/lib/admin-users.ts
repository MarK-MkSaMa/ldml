/**
 * 用户管理服务（后台用）
 */
import { db } from "@/db";
import {
  users,
  votes,
  comments,
  commentReports,
} from "@/db/schema";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

export type AdminUserRow = {
  id: string;
  linuxdoId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  trustLevel: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  voteCount: number;
  commentCount: number;
  reportCount: number; // 被举报次数
};

export type UserFilter = "all" | "admin" | "banned";

export async function listUsersForAdmin(
  filter: UserFilter = "all",
  search?: string,
  limit = 100,
): Promise<AdminUserRow[]> {
  const conds = [];
  if (filter === "admin") conds.push(eq(users.isAdmin, true));
  if (filter === "banned") conds.push(eq(users.isBanned, true));
  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    // username 模糊 + linuxdoId 精确
    const numId = Number(search.trim());
    if (Number.isFinite(numId) && Number.isInteger(numId)) {
      conds.push(
        or(ilike(users.username, s), eq(users.linuxdoId, numId))!,
      );
    } else {
      conds.push(ilike(users.username, s));
    }
  }

  // 第一阶段：拉用户基本信息
  const userRows = await db
    .select()
    .from(users)
    .where(conds.length === 0 ? undefined : and(...conds))
    .orderBy(desc(users.lastLoginAt))
    .limit(limit);

  if (userRows.length === 0) return [];
  const userIds = userRows.map((u) => u.id);

  // 第二阶段：并发查 3 类活跃统计，按 userId 分组
  const [voteStats, commentStats, reportStats] = await Promise.all([
    db
      .select({
        userId: votes.userId,
        value: count(),
      })
      .from(votes)
      .where(inArray(votes.userId, userIds))
      .groupBy(votes.userId),
    db
      .select({
        userId: comments.userId,
        value: count(),
      })
      .from(comments)
      .where(
        and(inArray(comments.userId, userIds), eq(comments.isDeleted, false)),
      )
      .groupBy(comments.userId),
    db
      .select({
        userId: comments.userId,
        value: count(commentReports.id),
      })
      .from(commentReports)
      .innerJoin(comments, eq(comments.id, commentReports.commentId))
      .where(inArray(comments.userId, userIds))
      .groupBy(comments.userId),
  ]);

  const voteMap = new Map(voteStats.map((r) => [r.userId, r.value]));
  const commentMap = new Map(commentStats.map((r) => [r.userId, r.value]));
  const reportMap = new Map(reportStats.map((r) => [r.userId, r.value]));

  // 抑制 unused
  void sql;

  return userRows.map((u) => ({
    id: u.id,
    linuxdoId: u.linuxdoId,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    trustLevel: u.trustLevel,
    isAdmin: u.isAdmin,
    isBanned: u.isBanned,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    voteCount: Number(voteMap.get(u.id) ?? 0),
    commentCount: Number(commentMap.get(u.id) ?? 0),
    reportCount: Number(reportMap.get(u.id) ?? 0),
  }));
}

export async function getUserByIdForAdmin(id: string): Promise<typeof users.$inferSelect | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function setUserBannedAdmin(
  userId: string,
  banned: boolean,
): Promise<void> {
  await db
    .update(users)
    .set({ isBanned: banned })
    .where(eq(users.id, userId));
}

/**
 * 切换管理员标志
 * 调用方需保证不会把唯一管理员降级
 */
export async function setUserAdminFlag(
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  await db
    .update(users)
    .set({ isAdmin })
    .where(eq(users.id, userId));
}

/**
 * 统计当前总管理员数（防止只剩自己时被降级）
 */
export async function countAdminUsers(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.isAdmin, true));
  return row?.value ?? 0;
}
