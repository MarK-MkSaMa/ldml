import Link from "next/link";
import { benchmarkQuestionStatusEnum, type BenchmarkQuestionStatus } from "@/db/schema";
import { listBenchmarkQuestionsForAdmin } from "@/lib/benchmarks";
import { BenchmarkQuestionRowActions } from "./row-actions";
import { BenchmarkResultForm } from "./result-form";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BenchmarkQuestionStatus, { name: string; cls: string }> = {
  pending: { name: "待审核", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  approved: { name: "已通过", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { name: "已拒绝", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  archived: { name: "已归档", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
};

export default async function AdminBenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && benchmarkQuestionStatusEnum.includes(sp.status as BenchmarkQuestionStatus)
    ? (sp.status as BenchmarkQuestionStatus)
    : undefined;
  const rows = await listBenchmarkQuestionsForAdmin({ status });

  function urlWith(nextStatus: BenchmarkQuestionStatus | undefined) {
    return nextStatus ? `/admin/benchmarks?status=${nextStatus}` : "/admin/benchmarks";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">基准测试</h1>
        <p className="mt-2 text-sm text-zinc-500">
          审核用户上传的文字模型基准测试题，并维护每个模型的人工测试结果。
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="py-1 text-zinc-500">状态</span>
        <FilterLink href={urlWith(undefined)} active={status === undefined}>全部</FilterLink>
        {benchmarkQuestionStatusEnum.map((s) => (
          <FilterLink key={s} href={urlWith(s)} active={status === s}>
            {STATUS_LABELS[s].name}
          </FilterLink>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的题目
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const label = STATUS_LABELS[row.status];
            return (
              <li key={row.id} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${label.cls}`}>{label.name}</span>
                      <span>上传者：{row.uploaderName}</span>
                      <span>提交：{formatDateTime(row.createdAt)}</span>
                      {row.reviewedAt && <span>审核：{formatDateTime(row.reviewedAt)}</span>}
                    </div>
                    <Block title="题目内容" content={row.question} />
                    <Block title="参考答案" content={row.referenceAnswer} />
                    {row.judgeNote && <Block title="判题说明" content={row.judgeNote} />}
                    {row.rejectReason && (
                      <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                        拒绝原因：{row.rejectReason}
                      </div>
                    )}
                  </div>
                  <div className="lg:w-56">
                    <BenchmarkQuestionRowActions id={row.id} status={row.status} />
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold">测试结果</h2>
                  {row.results.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">还没有录入测试结果</p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                          <tr>
                            <th className="py-2 pr-4 font-medium">模型</th>
                            <th className="py-2 pr-4 font-medium">结果</th>
                            <th className="py-2 pr-4 font-medium">回答</th>
                            <th className="py-2 font-medium">备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.results.map((result) => (
                            <tr key={result.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                              <td className="py-2 pr-4 align-top font-medium">{result.modelName}</td>
                              <td className={`py-2 pr-4 align-top ${result.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {result.isCorrect ? "正确" : "错误"}
                              </td>
                              <td className="max-w-md whitespace-pre-wrap py-2 pr-4 align-top text-xs text-zinc-600 dark:text-zinc-400">
                                {result.modelAnswer || "—"}
                              </td>
                              <td className="max-w-xs whitespace-pre-wrap py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                                {result.note || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <BenchmarkResultForm questionId={row.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

function Block({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-3">
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
