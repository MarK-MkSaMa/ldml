"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminFresh } from "@/lib/current-user";
import { withdrawVoteAdmin } from "@/lib/admin-votes";

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function withdrawVoteAdminAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const userId = getString(formData, "userId");
  const modelId = getString(formData, "modelId");
  const dimensionId = Number(getString(formData, "dimensionId"));

  if (!userId || !modelId || !Number.isInteger(dimensionId)) {
    throw new Error("参数不完整");
  }

  await withdrawVoteAdmin({
    adminId: admin.id,
    userId,
    modelId,
    dimensionId,
  });

  revalidatePath("/admin/votes");
  revalidatePath(`/admin/votes/${modelId}`);
  revalidatePath("/", "layout");
  updateTag("rankings");
}
