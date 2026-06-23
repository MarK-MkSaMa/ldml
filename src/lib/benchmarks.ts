/**
 * 基准测试服务层
 */
import { db } from "@/db";
import {
  benchmarkQuestions,
  benchmarkResults,
  users,
  type BenchmarkQuestionStatus,
} from "@/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export type BenchmarkQuestionInput = {
  uploaderId: string;
  question: string;
  referenceAnswer: string;
  judgeNote?: string | null;
};

export type BenchmarkResultInput = {
  questionId: string;
  modelName: string;
  isCorrect: boolean;
  modelAnswer?: string | null;
  note?: string | null;
  createdBy: string;
};

export type PublicBenchmarkQuestion = Awaited<ReturnType<typeof listPublicBenchmarkQuestions>>[number];
export type AdminBenchmarkQuestion = Awaited<ReturnType<typeof listBenchmarkQuestionsForAdmin>>[number];
export type BenchmarkLeaderboardRow = Awaited<ReturnType<typeof getBenchmarkLeaderboard>>[number];

const QUESTION_MAX = 10000;
const REFERENCE_MAX = 10000;
const NOTE_MAX = 2000;
const MODEL_NAME_MAX = 120;
const ANSWER_MAX = 20000;

function cleanQuestionInput(input: BenchmarkQuestionInput) {
  return {
    uploaderId: input.uploaderId,
    question: input.question.trim(),
    referenceAnswer: input.referenceAnswer.trim(),
    judgeNote: input.judgeNote?.trim() || null,
  };
}

function validateQuestionInput(input: BenchmarkQuestionInput) {
  const data = cleanQuestionInput(input);
  if (!data.question) throw new Error("题目内容不能为空");
  if (data.question.length > QUESTION_MAX) throw new Error(`题目内容超过 ${QUESTION_MAX} 字符`);
  if (!data.referenceAnswer) throw new Error("参考答案不能为空");
  if (data.referenceAnswer.length > REFERENCE_MAX) {
    throw new Error(`参考答案超过 ${REFERENCE_MAX} 字符`);
  }
  if (data.judgeNote && data.judgeNote.length > NOTE_MAX) {
    throw new Error(`判题说明超过 ${NOTE_MAX} 字符`);
  }
  return data;
}

function cleanResultInput(input: BenchmarkResultInput) {
  return {
    questionId: input.questionId,
    modelName: input.modelName.trim(),
    isCorrect: input.isCorrect,
    modelAnswer: input.modelAnswer?.trim() || null,
    note: input.note?.trim() || null,
    createdBy: input.createdBy,
  };
}

function validateResultInput(input: BenchmarkResultInput) {
  const data = cleanResultInput(input);
  if (!data.modelName) throw new Error("模型名不能为空");
  if (data.modelName.length > MODEL_NAME_MAX) throw new Error(`模型名超过 ${MODEL_NAME_MAX} 字符`);
  if (data.modelAnswer && data.modelAnswer.length > ANSWER_MAX) {
    throw new Error(`模型回答超过 ${ANSWER_MAX} 字符`);
  }
  if (data.note && data.note.length > NOTE_MAX) throw new Error(`备注超过 ${NOTE_MAX} 字符`);
  return data;
}

export async function createBenchmarkQuestion(input: BenchmarkQuestionInput) {
  const data = validateQuestionInput(input);
  const [row] = await db
    .insert(benchmarkQuestions)
    .values({
      uploaderId: data.uploaderId,
      question: data.question,
      referenceAnswer: data.referenceAnswer,
      judgeNote: data.judgeNote,
      status: "pending",
    })
    .returning();
  return row;
}

export async function getBenchmarkLeaderboard() {
  const rows = await db
    .select({
      modelName: benchmarkResults.modelName,
      isCorrect: benchmarkResults.isCorrect,
    })
    .from(benchmarkResults)
    .innerJoin(benchmarkQuestions, eq(benchmarkResults.questionId, benchmarkQuestions.id))
    .where(eq(benchmarkQuestions.status, "approved"));

  const map = new Map<string, { modelName: string; correctCount: number; wrongCount: number; totalCount: number }>();
  for (const row of rows) {
    const item = map.get(row.modelName) ?? {
      modelName: row.modelName,
      correctCount: 0,
      wrongCount: 0,
      totalCount: 0,
    };
    item.totalCount += 1;
    if (row.isCorrect) item.correctCount += 1;
    else item.wrongCount += 1;
    map.set(row.modelName, item);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      correctRate: row.totalCount === 0 ? 0 : row.correctCount / row.totalCount,
    }))
    .sort((a, b) => {
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (b.correctRate !== a.correctRate) return b.correctRate - a.correctRate;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.modelName.localeCompare(b.modelName, "zh-CN");
    });
}

export async function listPublicBenchmarkQuestions() {
  const questions = await db
    .select({
      id: benchmarkQuestions.id,
      question: benchmarkQuestions.question,
      referenceAnswer: benchmarkQuestions.referenceAnswer,
      judgeNote: benchmarkQuestions.judgeNote,
      createdAt: benchmarkQuestions.createdAt,
      uploaderName: users.username,
    })
    .from(benchmarkQuestions)
    .innerJoin(users, eq(benchmarkQuestions.uploaderId, users.id))
    .where(eq(benchmarkQuestions.status, "approved"))
    .orderBy(desc(benchmarkQuestions.createdAt));

  const results = questions.length === 0
    ? []
    : await db
        .select({
          questionId: benchmarkResults.questionId,
          modelName: benchmarkResults.modelName,
          isCorrect: benchmarkResults.isCorrect,
        })
        .from(benchmarkResults)
        .where(inArray(benchmarkResults.questionId, questions.map((q) => q.id)))
        .orderBy(asc(benchmarkResults.modelName));

  const grouped = new Map<string, typeof results>();
  for (const result of results) {
    grouped.set(result.questionId, [...(grouped.get(result.questionId) ?? []), result]);
  }

  return questions.map((question) => {
    const questionResults = grouped.get(question.id) ?? [];
    return {
      ...question,
      isTested: questionResults.length > 0,
      correctModels: questionResults.filter((r) => r.isCorrect).map((r) => r.modelName),
      wrongModels: questionResults.filter((r) => !r.isCorrect).map((r) => r.modelName),
    };
  });
}

export async function listBenchmarkQuestionsForAdmin(filter: { status?: BenchmarkQuestionStatus } = {}) {
  const conditions = [
    filter.status !== undefined ? eq(benchmarkQuestions.status, filter.status) : undefined,
  ].filter(Boolean) as (ReturnType<typeof eq>)[];

  const baseQuery = db
    .select({
      id: benchmarkQuestions.id,
      uploaderId: benchmarkQuestions.uploaderId,
      uploaderName: users.username,
      question: benchmarkQuestions.question,
      referenceAnswer: benchmarkQuestions.referenceAnswer,
      judgeNote: benchmarkQuestions.judgeNote,
      status: benchmarkQuestions.status,
      reviewedBy: benchmarkQuestions.reviewedBy,
      reviewedAt: benchmarkQuestions.reviewedAt,
      rejectReason: benchmarkQuestions.rejectReason,
      createdAt: benchmarkQuestions.createdAt,
      updatedAt: benchmarkQuestions.updatedAt,
    })
    .from(benchmarkQuestions)
    .innerJoin(users, eq(benchmarkQuestions.uploaderId, users.id));

  const filtered = conditions.length === 0 ? baseQuery : baseQuery.where(and(...conditions));
  const questions = await filtered.orderBy(desc(benchmarkQuestions.createdAt));

  const results = questions.length === 0
    ? []
    : await db
        .select({
          id: benchmarkResults.id,
          questionId: benchmarkResults.questionId,
          modelName: benchmarkResults.modelName,
          isCorrect: benchmarkResults.isCorrect,
          modelAnswer: benchmarkResults.modelAnswer,
          note: benchmarkResults.note,
          createdAt: benchmarkResults.createdAt,
          updatedAt: benchmarkResults.updatedAt,
        })
        .from(benchmarkResults)
        .where(inArray(benchmarkResults.questionId, questions.map((q) => q.id)))
        .orderBy(asc(benchmarkResults.modelName));

  const grouped = new Map<string, typeof results>();
  for (const result of results) {
    grouped.set(result.questionId, [...(grouped.get(result.questionId) ?? []), result]);
  }

  return questions.map((question) => ({
    ...question,
    results: grouped.get(question.id) ?? [],
  }));
}

export async function approveBenchmarkQuestion(id: string, reviewerId: string) {
  const [updated] = await db
    .update(benchmarkQuestions)
    .set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectReason: null,
      updatedAt: new Date(),
    })
    .where(eq(benchmarkQuestions.id, id))
    .returning();
  if (!updated) throw new Error("题目不存在");
  return updated;
}

export async function rejectBenchmarkQuestion(
  id: string,
  reviewerId: string,
  rejectReason?: string | null,
) {
  const [updated] = await db
    .update(benchmarkQuestions)
    .set({
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectReason: rejectReason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(benchmarkQuestions.id, id))
    .returning();
  if (!updated) throw new Error("题目不存在");
  return updated;
}

export async function archiveBenchmarkQuestion(id: string, reviewerId: string) {
  const [updated] = await db
    .update(benchmarkQuestions)
    .set({
      status: "archived",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(benchmarkQuestions.id, id))
    .returning();
  if (!updated) throw new Error("题目不存在");
  return updated;
}

export async function upsertBenchmarkResult(input: BenchmarkResultInput) {
  const data = validateResultInput(input);
  const [question] = await db
    .select({ id: benchmarkQuestions.id })
    .from(benchmarkQuestions)
    .where(eq(benchmarkQuestions.id, data.questionId));
  if (!question) throw new Error("题目不存在");

  const [row] = await db
    .insert(benchmarkResults)
    .values({
      questionId: data.questionId,
      modelName: data.modelName,
      isCorrect: data.isCorrect,
      modelAnswer: data.modelAnswer,
      note: data.note,
      createdBy: data.createdBy,
    })
    .onConflictDoUpdate({
      target: [benchmarkResults.questionId, benchmarkResults.modelName],
      set: {
        isCorrect: data.isCorrect,
        modelAnswer: data.modelAnswer,
        note: data.note,
        createdBy: data.createdBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
