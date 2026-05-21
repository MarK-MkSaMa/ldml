"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  unhideCommentAdmin,
  hideCommentAdmin,
  deleteCommentAdmin,
  resolveReportAdmin,
  resolveAllReportsForComment,
} from "@/lib/admin-comments";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("无权限");
  return session.user.id;
}

function bust() {
  revalidatePath("/admin/comments");
  revalidatePath("/admin/reports");
}

export async function unhideAction(commentId: string) {
  await requireAdmin();
  await unhideCommentAdmin(commentId);
  bust();
}

export async function hideAction(commentId: string) {
  await requireAdmin();
  await hideCommentAdmin(commentId);
  bust();
}

export async function deleteAction(commentId: string) {
  const adminId = await requireAdmin();
  await deleteCommentAdmin(commentId);
  // 删除后自动 resolve 这条评论上的所有 pending 举报
  await resolveAllReportsForComment(commentId, adminId, "resolved");
  bust();
}

export async function resolveReportAction(
  reportId: string,
  status: "resolved" | "rejected",
) {
  const adminId = await requireAdmin();
  await resolveReportAdmin(reportId, adminId, status);
  bust();
}
