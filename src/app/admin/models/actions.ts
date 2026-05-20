"use server";

/**
 * 模型管理 Server Actions
 */
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createModelAdmin,
  updateModelAdmin,
  deleteModelAdmin,
  setModelStatusAdmin,
  setModelPinnedAdmin,
} from "@/lib/admin-models";
import type { ModelStatus } from "@/db/schema";
import { modelStatusEnum } from "@/db/schema";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("无权限");
}

function parseInput(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const status = get("status") as ModelStatus;
  if (!modelStatusEnum.includes(status)) {
    throw new Error("非法的状态值");
  }
  return {
    name: get("name"),
    slug: get("slug"),
    licenseId: Number(get("licenseId")),
    categoryId: Number(get("categoryId")),
    vendor: get("vendor") || null,
    logoUrl: get("logoUrl") || null,
    homepageUrl: get("homepageUrl") || null,
    description: get("description") || null,
    contextLength: get("contextLength") ? Number(get("contextLength")) : null,
    params: get("params") || null,
    releasedAt: get("releasedAt") || null,
    status,
    pinned: formData.get("pinned") === "on",
  };
}

function bust() {
  // 写完同时让前台 / 后台缓存失效
  revalidatePath("/admin/models");
  revalidatePath("/", "layout");
  updateTag("rankings");
}

export async function createModelAction(formData: FormData) {
  await requireAdmin();
  const input = parseInput(formData);
  await createModelAdmin(input);
  bust();
  redirect("/admin/models");
}

export async function updateModelAction(id: string, formData: FormData) {
  await requireAdmin();
  const input = parseInput(formData);
  await updateModelAdmin(id, input);
  bust();
  redirect("/admin/models");
}

export async function setStatusAction(id: string, status: ModelStatus) {
  await requireAdmin();
  if (!modelStatusEnum.includes(status)) throw new Error("非法状态");
  await setModelStatusAdmin(id, status);
  bust();
}

export async function setPinnedAction(id: string, pinned: boolean) {
  await requireAdmin();
  await setModelPinnedAdmin(id, pinned);
  bust();
}

export async function deleteModelAction(id: string) {
  await requireAdmin();
  await deleteModelAdmin(id);
  bust();
}
