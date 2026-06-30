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
  type ModelPrice,
} from "@/lib/admin-models";
import { requireAdminFresh } from "@/lib/current-user";
import { promoteEligibleModels } from "@/lib/promotion";
import { syncModelsFromModelsDev } from "@/lib/models-dev-sync";
import type { ModelStatus } from "@/db/schema";
import { modelStatusEnum } from "@/db/schema";

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseCsv(value: string): string[] | null {
  const items = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function parsePrice(formData: FormData): ModelPrice | null {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const price: ModelPrice = {};
  for (const [field, key] of [
    ["priceInput", "input"],
    ["priceOutput", "output"],
    ["priceCacheRead", "cacheRead"],
    ["priceCacheWrite", "cacheWrite"],
  ] as const) {
    const raw = get(field);
    if (!raw) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) price[key] = n;
  }
  return Object.keys(price).length > 0 ? price : null;
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
    categoryId: Number(get("categoryId")),
    lab: get("lab") || null,
    homepageUrl: get("homepageUrl") || null,
    releasedAt: get("releasedAt") || null,
    contextTokens: parseOptionalNumber(get("contextTokens")),
    outputTokens: parseOptionalNumber(get("outputTokens")),
    inputModalities: parseCsv(get("inputModalities")),
    outputModalities: parseCsv(get("outputModalities")),
    supportsReasoning: formData.get("supportsReasoning") === "on",
    supportsToolCall: formData.get("supportsToolCall") === "on",
    openWeights:
      formData.get("openWeights") === "unknown"
        ? null
        : formData.get("openWeights") === "true",
    price: parsePrice(formData),
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

export async function syncModelsDevAction() {
  await requireAdminFresh();
  const result = await syncModelsFromModelsDev();
  bust();
  return result;
}
