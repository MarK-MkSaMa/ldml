"use server";

import { revalidatePath } from "next/cache";
import {
  createKeyword,
  deleteKeyword,
} from "@/lib/admin-keywords";
import { requireAdminFresh } from "@/lib/current-user";

function bust() {
  revalidatePath("/admin/keywords");
}

export async function createKeywordAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const adminId = admin.id;
  const pattern = String(formData.get("pattern") ?? "");
  const isRegex = formData.get("isRegex") === "on";
  const action = (formData.get("action") as "block" | "hide") ?? "block";
  await createKeyword(adminId, { pattern, isRegex, action });
  bust();
}

export async function deleteKeywordAction(id: number) {
  await requireAdminFresh();
  await deleteKeyword(id);
  bust();
}
