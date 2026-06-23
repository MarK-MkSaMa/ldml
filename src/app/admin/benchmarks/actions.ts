"use server";

import { revalidatePath } from "next/cache";
import { requireAdminFresh } from "@/lib/current-user";
import {
  approveBenchmarkQuestion,
  archiveBenchmarkQuestion,
  rejectBenchmarkQuestion,
  upsertBenchmarkResult,
} from "@/lib/benchmarks";

function bust() {
  revalidatePath("/admin/benchmarks");
  revalidatePath("/benchmarks");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function approveBenchmarkQuestionAction(id: string) {
  const admin = await requireAdminFresh();
  await approveBenchmarkQuestion(id, admin.id);
  bust();
}

export async function rejectBenchmarkQuestionAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const id = getString(formData, "id");
  if (!id) throw new Error("题目 ID 缺失");
  await rejectBenchmarkQuestion(id, admin.id, getString(formData, "rejectReason") || null);
  bust();
}

export async function archiveBenchmarkQuestionAction(id: string) {
  const admin = await requireAdminFresh();
  await archiveBenchmarkQuestion(id, admin.id);
  bust();
}

export async function upsertBenchmarkResultAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const questionId = getString(formData, "questionId");
  const modelName = getString(formData, "modelName");
  const isCorrectValue = getString(formData, "isCorrect");
  if (!questionId) throw new Error("题目 ID 缺失");
  if (isCorrectValue !== "true" && isCorrectValue !== "false") throw new Error("请选择判题结果");

  await upsertBenchmarkResult({
    questionId,
    modelName,
    isCorrect: isCorrectValue === "true",
    modelAnswer: getString(formData, "modelAnswer") || null,
    note: getString(formData, "note") || null,
    createdBy: admin.id,
  });
  bust();
}
