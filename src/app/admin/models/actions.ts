"use server";

/**
 * 模型管理 Server Actions
 */
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  createModelAdmin,
  updateModelAdmin,
  deleteModelAdmin,
  setModelStatusAdmin,
  setModelPinnedAdmin,
} from "@/lib/admin-models";
import { requireAdminFresh } from "@/lib/current-user";
import { promoteEligibleModels } from "@/lib/promotion";
import type { ModelStatus } from "@/db/schema";
import { modelStatusEnum } from "@/db/schema";

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
    categoryId: Number(get("categoryId")),
    vendor: get("vendor") || null,
    licenseText: get("licenseText") || null,
    homepageUrl: get("homepageUrl") || null,
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
  await requireAdminFresh();
  const input = parseInput(formData);
  await createModelAdmin(input);
  bust();
  redirect("/admin/models");
}

export async function updateModelAction(id: string, formData: FormData) {
  await requireAdminFresh();
  const input = parseInput(formData);
  await updateModelAdmin(id, input);
  bust();
  redirect("/admin/models");
}

export async function setStatusAction(id: string, status: ModelStatus) {
  await requireAdminFresh();
  if (!modelStatusEnum.includes(status)) throw new Error("非法状态");
  await setModelStatusAdmin(id, status);
  bust();
}

export async function setPinnedAction(id: string, pinned: boolean) {
  await requireAdminFresh();
  await setModelPinnedAdmin(id, pinned);
  bust();
}

export async function deleteModelAction(id: string) {
  await requireAdminFresh();
  await deleteModelAdmin(id);
  bust();
}

/**
 * 立即检查所有观察区模型，把符合条件的转为正式榜
 */
export async function promoteEligibleAction(): Promise<{
  checked: number;
  promoted: number;
}> {
  await requireAdminFresh();
  const result = await promoteEligibleModels();
  if (result.promoted > 0) bust();
  return result;
}
