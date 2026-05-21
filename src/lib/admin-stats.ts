/**
 * 后台仪表盘统计
 */
import { db } from "@/db";
import {
  users,
  models,
  votes,
  announcements,
  commentReports,
} from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";

export type DashboardStats = {
  userCount: number;
  modelCount: number;
  voteCount: number;
  announcementCount: number;
  // 待处理举报数（提醒管理员）
  pendingReportCount: number;
  // 简单分布
  modelByStatus: { status: string; count: number }[];
  // 最近 5 条公告（含草稿）
  recentAnnouncements: {
    id: string;
    title: string;
    isActive: boolean;
    isPinned: boolean;
    createdAt: Date;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    [{ value: userCount }],
    [{ value: modelCount }],
    [{ value: voteCount }],
    [{ value: announcementCount }],
    [{ value: pendingReportCount }],
    statusRows,
    recent,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(models),
    db.select({ value: count() }).from(votes),
    db.select({ value: count() }).from(announcements),
    db
      .select({ value: count() })
      .from(commentReports)
      .where(eq(commentReports.status, "pending")),
    // 按状态分组
    db
      .select({ status: models.status, value: count() })
      .from(models)
      .groupBy(models.status),
    db
      .select({
        id: announcements.id,
        title: announcements.title,
        isActive: announcements.isActive,
        isPinned: announcements.isPinned,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(5),
  ]);

  // 抑制 unused
  void and;

  return {
    userCount,
    modelCount,
    voteCount,
    announcementCount,
    pendingReportCount,
    modelByStatus: statusRows.map((r) => ({
      status: r.status,
      count: r.value,
    })),
    recentAnnouncements: recent,
  };
}
