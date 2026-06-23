"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserFresh } from "@/lib/current-user";
import { submitSubjectiveTestVote } from "@/lib/subjective-tests";

export type SubjectiveVoteState = { ok: boolean; message: string };

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitSubjectiveVoteAction(
  _prevState: SubjectiveVoteState,
  formData: FormData,
): Promise<SubjectiveVoteState> {
  const user = await getCurrentUserFresh();
  if (!user) return { ok: false, message: "请先登录后再投票" };
  if (user.trustLevel < 1) {
    return { ok: false, message: `你的信任等级为 ${user.trustLevel}，需要达到 1 级才能投票` };
  }

  const activityId = getString(formData, "activityId");
  if (!activityId) return { ok: false, message: "活动 ID 缺失" };

  const ranks = [...formData.entries()]
    .filter(([key]) => key.startsWith("rank:"))
    .map(([key, value]) => ({
      entryId: key.slice("rank:".length),
      rank: typeof value === "string" ? Number(value) : Number.NaN,
    }));

  try {
    await submitSubjectiveTestVote(activityId, user.id, ranks);
    revalidatePath("/subjective-tests");
    revalidatePath(`/subjective-tests/${activityId}`);
    revalidatePath("/admin/subjective-tests");
    return { ok: true, message: "排序投票已保存，可随时重新提交更新。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "投票失败，请稍后重试" };
  }
}
