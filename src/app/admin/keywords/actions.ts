"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createKeyword,
  deleteKeyword,
} from "@/lib/admin-keywords";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("无权限");
  return session.user.id;
}

function bust() {
  revalidatePath("/admin/keywords");
}

export async function createKeywordAction(formData: FormData) {
  const adminId = await requireAdmin();
  const pattern = String(formData.get("pattern") ?? "");
  const isRegex = formData.get("isRegex") === "on";
  const action = (formData.get("action") as "block" | "hide") ?? "block";
  await createKeyword(adminId, { pattern, isRegex, action });
  bust();
}

export async function deleteKeywordAction(id: number) {
  await requireAdmin();
  await deleteKeyword(id);
  bust();
}
