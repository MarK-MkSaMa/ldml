"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminFresh } from "@/lib/current-user";
import {
  approveBenchmarkQuestion,
  archiveBenchmarkQuestion,
  deleteBenchmarkQuestionAdmin,
  deleteBenchmarkResultAdmin,
  rejectBenchmarkQuestion,
  updateBenchmarkQuestionAdmin,
  upsertBenchmarkResult,
} from "@/lib/benchmarks";

function bust(id?: string) {
  revalidatePath("/admin/benchmarks");
  if (id) revalidatePath(`/admin/benchmarks/${id}`);
  revalidatePath("/benchmarks");
  revalidatePath("/benchmarks/questions");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function approveBenchmarkQuestionAction(id: string) {
  const admin = await requireAdminFresh();
  await approveBenchmarkQuestion(id, admin.id);
  bust(id);
}

export async function rejectBenchmarkQuestionAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const id = getString(formData, "id");
  if (!id) throw new Error("题目 ID 缺失");
  await rejectBenchmarkQuestion(id, admin.id, getString(formData, "rejectReason") || null);
  bust(id);
}

export async function archiveBenchmarkQuestionAction(id: string) {
  const admin = await requireAdminFresh();
  await archiveBenchmarkQuestion(id, admin.id);
  bust(id);
}

export async function updateBenchmarkQuestionAction(id: string, formData: FormData) {
  const admin = await requireAdminFresh();
  await updateBenchmarkQuestionAdmin(
    id,
    {
      question: getString(formData, "question"),
      referenceAnswer: getString(formData, "referenceAnswer"),
      judgeNote: getString(formData, "judgeNote") || null,
    },
    admin.id,
  );
  bust(id);
}

export async function deleteBenchmarkQuestionAction(id: string) {
  await requireAdminFresh();
  await deleteBenchmarkQuestionAdmin(id);
  bust(id);
  redirect("/admin/benchmarks");
}

export async function upsertBenchmarkResultAction(formData: FormData) {
  const admin = await requireAdminFresh();
  const questionId = getString(formData, "questionId");
  const modelName = getString(formData, "modelName");
  const isCorrectValue = getString(formData, "isCorrect");
  if (!questionId) throw new Error("题目 ID 缺失");
  if (isCorrectValue !== "true" && isCorrectValue !== "false") throw new Error("请选择判题结果");

  await upsertBenchmarkResult({
    id: getString(formData, "resultId") || null,
    questionId,
    modelName,
    isCorrect: isCorrectValue === "true",
    modelAnswer: getString(formData, "modelAnswer") || null,
    note: getString(formData, "note") || null,
    createdBy: admin.id,
  });
  bust(questionId);
}

export async function deleteBenchmarkResultAction(id: string) {
  await requireAdminFresh();
  const deleted = await deleteBenchmarkResultAdmin(id);
  bust(deleted.questionId);
}
