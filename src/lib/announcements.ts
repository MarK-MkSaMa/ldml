/**
 * 公告服务层
 *
 * 公告读写都走这里，写入时同步渲染 Markdown 为安全 HTML 并存库。
 */
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { renderMarkdown, assertLength } from "@/lib/markdown";

export type Announcement = typeof announcements.$inferSelect;

const TITLE_MAX = 80;
const CONTENT_MAX = 5000;

export type AnnouncementInput = {
  title: string;
  content: string;
  isActive: boolean;
  isPinned: boolean;
};

function validateInput(input: AnnouncementInput): void {
  assertLength(input.title, TITLE_MAX, "标题");
  assertLength(input.content, CONTENT_MAX, "正文");
}

/**
 * 列表（后台用）
 */
export async function listAnnouncementsForAdmin(): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
}

/**
 * 前台用：仅 active 的公告
 */
export async function listActiveAnnouncements(): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.isActive, true))
    .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt));
}

/**
 * 横条要显示的那条：active + pinned + 最新一条
 */
export async function getActiveBannerAnnouncement(): Promise<Announcement | null> {
  try {
    const [row] = await db
      .select()
      .from(announcements)
      .where(and(eq(announcements.isActive, true), eq(announcements.isPinned, true)))
      .orderBy(desc(announcements.publishedAt))
      .limit(1);
    return row ?? null;
  } catch (error) {
    // 公告横条是非核心能力；数据库尚未 push 或公告表异常时不应阻断首页/排行榜渲染。
    console.error("getActiveBannerAnnouncement failed:", error);
    return null;
  }
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const [row] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id));
  return row ?? null;
}

/**
 * 新建
 * createdBy 必须是 users.id（uuid）
 */
export async function createAnnouncement(
  createdBy: string,
  input: AnnouncementInput,
): Promise<Announcement> {
  validateInput(input);
  const html = await renderMarkdown(input.content);
  const [row] = await db
    .insert(announcements)
    .values({
      title: input.title.trim(),
      content: input.content,
      contentHtml: html,
      isActive: input.isActive,
      isPinned: input.isPinned,
      publishedAt: input.isActive ? new Date() : null,
      createdBy,
    })
    .returning();
  return row;
}

/**
 * 更新
 */
export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<Announcement | null> {
  validateInput(input);
  const html = await renderMarkdown(input.content);

  // 如果之前未发布、本次切到 active，更新 publishedAt
  const [existing] = await db
    .select({ isActive: announcements.isActive, publishedAt: announcements.publishedAt })
    .from(announcements)
    .where(eq(announcements.id, id));
  if (!existing) return null;

  const shouldSetPublishedAt =
    input.isActive && (!existing.isActive || existing.publishedAt === null);

  const [row] = await db
    .update(announcements)
    .set({
      title: input.title.trim(),
      content: input.content,
      contentHtml: html,
      isActive: input.isActive,
      isPinned: input.isPinned,
      ...(shouldSetPublishedAt ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))
    .returning();
  return row ?? null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const rows = await db.delete(announcements).where(eq(announcements.id, id)).returning({
    id: announcements.id,
  });
  return rows.length > 0;
}

/**
 * 切换 isActive
 */
export async function toggleAnnouncementActive(
  id: string,
  active: boolean,
): Promise<Announcement | null> {
  const [existing] = await db
    .select({ publishedAt: announcements.publishedAt })
    .from(announcements)
    .where(eq(announcements.id, id));
  if (!existing) return null;
  const [row] = await db
    .update(announcements)
    .set({
      isActive: active,
      ...(active && existing.publishedAt === null ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))
    .returning();
  return row ?? null;
}

/**
 * 切换 isPinned
 */
export async function toggleAnnouncementPinned(
  id: string,
  pinned: boolean,
): Promise<Announcement | null> {
  const [row] = await db
    .update(announcements)
    .set({ isPinned: pinned, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();
  return row ?? null;
}
