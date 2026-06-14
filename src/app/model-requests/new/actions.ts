"use server";

import { revalidatePath } from "next/cache";
import { createModelRequest } from "@/lib/model-requests";
import { getCurrentUserFresh } from "@/lib/current-user";

export type ModelRequestFormState = {
  ok: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
      vendor: getString(formData, "vendor") || null,
      licenseText: getString(formData, "licenseText") || null,
      homepageUrl: getString(formData, "homepageUrl") || null,
      releasedAt: getString(formData, "releasedAt") || null,
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
