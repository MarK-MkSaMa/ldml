"use server";

/**
 * 公告管理的 Server Actions
 *
 * 所有操作都要求当前用户是管理员，否则抛错。
 * 表单组件直接 import 这些函数挂到 <form action={...}>。
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  toggleAnnouncementPinned,
} from "@/lib/announcements";

async function requireAdmin(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("无权限");
  }
  return { id: session.user.id };
}

function parseInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    isActive: formData.get("isActive") === "on",
    isPinned: formData.get("isPinned") === "on",
  };
}

/**
 * 新建：表单 action
 */
export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  await deleteAnnouncement(id);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

/**
 * 上线 / 下线
 */
export async function toggleActiveAction(id: string, active: boolean) {
  await requireAdmin();
  await toggleAnnouncementActive(id, active);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

/**
 * 置顶 / 取消置顶
 */
export async function togglePinnedAction(id: string, pinned: boolean) {
  await requireAdmin();
  await toggleAnnouncementPinned(id, pinned);
  revalidatePath("/admin/announcements");
  revalidatePath("/");
}
