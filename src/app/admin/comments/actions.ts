"use server";

import { revalidatePath } from "next/cache";
import {
  unhideCommentAdmin,
  hideCommentAdmin,
  deleteCommentAdmin,
  resolveReportAdmin,
  resolveAllReportsForComment,
} from "@/lib/admin-comments";
import { requireAdminFresh } from "@/lib/current-user";

function bust() {
  revalidatePath("/admin/comments");
  revalidatePath("/admin/reports");
}

export async function unhideAction(commentId: string) {
  await requireAdminFresh();
  await unhideCommentAdmin(commentId);
  bust();
}

export async function hideAction(commentId: string) {
  await requireAdminFresh();
  await hideCommentAdmin(commentId);
  bust();
}

export async function deleteAction(commentId: string) {
  const admin = await requireAdminFresh();
  await deleteCommentAdmin(commentId);
  // 删除后自动 resolve 这条评论上的所有 pending 举报
  await resolveAllReportsForComment(commentId, admin.id, "resolved");
  bust();
}

export async function resolveReportAction(
  reportId: string,
  status: "resolved" | "rejected",
) {
  const admin = await requireAdminFresh();
  await resolveReportAdmin(reportId, admin.id, status);
  bust();
}
