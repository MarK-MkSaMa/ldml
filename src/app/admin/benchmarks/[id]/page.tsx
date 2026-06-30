import Link from "next/link";
import { notFound } from "next/navigation";
import type { BenchmarkQuestionStatus } from "@/db/schema";
import { getBenchmarkQuestionForAdmin } from "@/lib/benchmarks";
import { DeleteBenchmarkQuestionButton, DeleteBenchmarkResultButton } from "../delete-actions";
import { updateBenchmarkQuestionAction } from "../actions";
import { BenchmarkResultForm } from "../result-form";
import { BenchmarkQuestionRowActions } from "../row-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BenchmarkQuestionStatus, { name: string; cls: string }> = {
  pending: { name: "待审核", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  approved: { name: "已通过", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { name: "已拒绝", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  archived: { name: "已归档", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
};

export default async function AdminBenchmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getBenchmarkQuestionForAdmin(id);
  if (!question) notFound();

  const label = STATUS_LABELS[question.status];
  const updateAction = updateBenchmarkQuestionAction.bind(null, question.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/admin/benchmarks" className="text-xs text-zinc-500 hover:underline">
            ← 返回基准测试列表
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">基准测试详情</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${label.cls}`}>{label.name}</span>
            <span>上传者：{question.uploaderName}</span>
            <span>提交：{formatDateTime(question.createdAt)}</span>
            {question.reviewedAt && <span>审核/编辑：{formatDateTime(question.reviewedAt)}</span>}
            <span>结果：{question.results.length}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <BenchmarkQuestionRowActions id={question.id} status={question.status} />
          <DeleteBenchmarkQuestionButton id={question.id} />
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">完整内容</h2>
        <Block title="题目内容" content={question.question} />
        <Block title="参考答案" content={question.referenceAnswer} />
        <Block title="判题说明" content={question.judgeNote || "—"} />
        {question.rejectReason && (
          <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            拒绝原因：{question.rejectReason}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">编辑题目</h2>
        <form action={updateAction} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            题目内容
            <textarea
              name="question"
              required
              rows={8}
              maxLength={10000}
              className={inputCls}
              defaultValue={question.question}
            />
          </label>
          <label className="block text-sm font-medium">
            参考答案
            <textarea
              name="referenceAnswer"
              required
              rows={6}
              maxLength={10000}
              className={inputCls}
              defaultValue={question.referenceAnswer}
            />
          </label>
          <label className="block text-sm font-medium">
            判题说明
            <textarea
              name="judgeNote"
              rows={4}
              maxLength={2000}
              className={inputCls}
              defaultValue={question.judgeNote ?? ""}
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            保存题目
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">测试结果</h2>
          <span className="text-xs text-zinc-500">共 {question.results.length} 条</span>
        </div>

        {question.results.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">还没有录入测试结果</p>
        ) : (
          <div className="mt-4 space-y-4">
            {question.results.map((result) => (
              <div key={result.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{result.modelName}</span>
                    <span className={result.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {result.isCorrect ? "正确" : "错误"}
                    </span>
                    <span className="text-xs text-zinc-500">更新：{formatDateTime(result.updatedAt)}</span>
                  </div>
                  <DeleteBenchmarkResultButton id={result.id} modelName={result.modelName} />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Block title="模型回答" content={result.modelAnswer || "—"} compact />
                  <Block title="备注" content={result.note || "—"} compact />
                </div>
                <BenchmarkResultForm questionId={question.id} initialValue={result} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">添加 / 更新测试结果</h3>
          <BenchmarkResultForm questionId={question.id} />
        </div>
      </section>
    </div>
  );
}

function Block({ title, content, compact = false }: { title: string; content: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mt-4"}>
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
        {content}
      </div>
    </div>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
