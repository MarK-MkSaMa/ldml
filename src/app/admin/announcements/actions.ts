"use server";

/**
 * 公告管理的 Server Actions
 *
 * 所有操作都要求当前用户是管理员，否则抛错。
 * 表单组件直接 import 这些函数挂到 <form action={...}>。
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  toggleAnnouncementPinned,
} from "@/lib/announcements";
import { requireAdminFresh } from "@/lib/current-user";
import { renderMarkdown } from "@/lib/markdown";

function parseInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    isActive: formData.get("isActive") === "on",
    isPinned: formData.get("isPinned") === "on",
  };
}

/**
 * 公告正文预览：复用正式发布时的 Markdown 渲染与清洗管线。
 */
export async function previewAnnouncementAction(content: string) {
  await requireAdminFresh();
  if (content.length > 5000) {
    return { ok: false as const, message: "正文超出长度限制（最多 5000 字）" };
  }

  return {
    ok: true as const,
    html: content.trim() ? await renderMarkdown(content) : "",
  };
}

/**
 * 新建：表单 action
 */
export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const input = parseInput(formData);
  await createAnnouncement(admin.id, input);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  redirect("/admin/announcements");
}

/**
 * 更新：表单 action，要带 id
 */
export async function updateAnnouncementAction(id: string, formData: FormData) {
  await requireAdminFresh();
  const input = parseInput(formData);
  await updateAnnouncement(id, input);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  redirect("/admin/announcements");
}

/**
 * 删除
 */
export async function deleteAnnouncementAction(id: string) {
  await requireAdminFresh();
  await deleteAnnouncement(id);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

/**
 * 上线 / 下线
 */
export async function toggleActiveAction(id: string, active: boolean) {
  await requireAdminFresh();
  await toggleAnnouncementActive(id, active);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

/**
 * 置顶 / 取消置顶
 */
export async function togglePinnedAction(id: string, pinned: boolean) {
  await requireAdminFresh();
  await toggleAnnouncementPinned(id, pinned);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}
