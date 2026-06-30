"use server";

import { revalidatePath } from "next/cache";
import { createModelRequest, type ModelRequestPrice } from "@/lib/model-requests";
import { getCurrentUserFresh } from "@/lib/current-user";

export type ModelRequestFormState = {
  ok: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

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

function parsePrice(formData: FormData): ModelRequestPrice | null {
  const price: ModelRequestPrice = {};
  for (const [field, key] of [
    ["priceInput", "input"],
    ["priceOutput", "output"],
    ["priceCacheRead", "cacheRead"],
    ["priceCacheWrite", "cacheWrite"],
  ] as const) {
    const raw = getString(formData, field).trim();
    if (!raw) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) price[key] = n;
  }
  return Object.keys(price).length > 0 ? price : null;
}

export async function submitModelRequestAction(
  _prevState: ModelRequestFormState,
  formData: FormData,
): Promise<ModelRequestFormState> {
  const user = await getCurrentUserFresh();
  if (!user) return { ok: false, message: "请先登录后再提交模型申请" };
  if (user.trustLevel < 1) {
    return { ok: false, message: `你的信任等级为 ${user.trustLevel}，需要达到 1 级才能提交申请` };
  }

  try {
    await createModelRequest({
      requesterId: user.id,
      name: getString(formData, "name"),
      slug: getString(formData, "slug"),
      categoryId: Number(getString(formData, "categoryId")),
      lab: getString(formData, "lab") || null,
      homepageUrl: getString(formData, "homepageUrl") || null,
      releasedAt: getString(formData, "releasedAt") || null,
      contextTokens: parseOptionalNumber(getString(formData, "contextTokens")),
      outputTokens: parseOptionalNumber(getString(formData, "outputTokens")),
      inputModalities: parseCsv(getString(formData, "inputModalities")),
      outputModalities: parseCsv(getString(formData, "outputModalities")),
      supportsReasoning: formData.get("supportsReasoning") === "on",
      supportsToolCall: formData.get("supportsToolCall") === "on",
      openWeights:
        formData.get("openWeights") === "unknown"
          ? null
          : formData.get("openWeights") === "true",
      price: parsePrice(formData),
    });
    revalidatePath("/admin/model-requests");
    return { ok: true, message: "申请已提交，管理员审核通过后会进入观察区。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "提交失败，请稍后重试",
    };
  }
}
