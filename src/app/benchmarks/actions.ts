"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserFresh } from "@/lib/current-user";
import { createBenchmarkQuestion } from "@/lib/benchmarks";

export type BenchmarkQuestionFormState = {
  ok: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitBenchmarkQuestionAction(
  _prevState: BenchmarkQuestionFormState,
  formData: FormData,
): Promise<BenchmarkQuestionFormState> {
  const user = await getCurrentUserFresh();
  if (!user) return { ok: false, message: "请先登录后再提交题目" };
  if (user.trustLevel < 1) {
    return { ok: false, message: `你的信任等级为 ${user.trustLevel}，需要达到 1 级才能提交题目` };
  }

  try {
    await createBenchmarkQuestion({
      uploaderId: user.id,
      question: getString(formData, "question"),
      referenceAnswer: getString(formData, "referenceAnswer"),
      judgeNote: getString(formData, "judgeNote") || null,
    });
    revalidatePath("/benchmarks");
    revalidatePath("/admin/benchmarks");
    return { ok: true, message: "题目已提交，审核通过后会进入公开题库。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "提交失败，请稍后重试",
    };
  }
}
