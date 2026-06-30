import Link from "next/link";
import { benchmarkQuestionStatusEnum, type BenchmarkQuestionStatus } from "@/db/schema";
import { listBenchmarkQuestionsForAdmin } from "@/lib/benchmarks";
import { BenchmarkQuestionRowActions } from "./row-actions";

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
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {rows.map((row) => {
            const label = STATUS_LABELS[row.status];
            return (
              <li key={row.id} className="p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${label.cls}`}>{label.name}</span>
                      <span>上传者：{row.uploaderName}</span>
                      <span>提交：{formatDateTime(row.createdAt)}</span>
                      <span>结果：{row.results.length}</span>
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                      {summarize(row.question)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                    <BenchmarkQuestionRowActions id={row.id} status={row.status} />
                    <Link
                      href={`/admin/benchmarks/${row.id}`}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      详情
                    </Link>
                  </div>
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

function summarize(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
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
