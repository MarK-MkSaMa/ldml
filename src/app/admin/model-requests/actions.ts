"use server";

import { revalidatePath, updateTag } from "next/cache";
import { approveModelRequest, rejectModelRequest } from "@/lib/model-requests";
import { requireAdminFresh } from "@/lib/current-user";

function bust() {
  revalidatePath("/admin/model-requests");
  revalidatePath("/admin/models");
  revalidatePath("/", "layout");
  updateTag("rankings");
}

export async function approveModelRequestAction(id: string) {
  const admin = await requireAdminFresh();
  await approveModelRequest(id, admin.id);
  bust();
}

export async function rejectModelRequestAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const id = formData.get("id");
  const reason = formData.get("rejectReason");
  if (typeof id !== "string" || !id) throw new Error("申请 ID 缺失");
  await rejectModelRequest(
    id,
    admin.id,
    typeof reason === "string" ? reason : null,
  );
  bust();
}
