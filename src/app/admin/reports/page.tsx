/**
 * /admin/reports —— 举报队列
 */
import Link from "next/link";
import { listReportsForAdmin, type ReportFilter } from "@/lib/admin-comments";
import { ReportRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "resolved", label: "已处理" },
  { value: "rejected", label: "已驳回" },
  { value: "all", label: "全部" },
];

const REASON_LABEL: Record<string, string> = {
  spam: "垃圾广告",
  abuse: "辱骂攻击",
  off_topic: "无关主题",
  other: "其他",
};

const STATUS_LABEL: Record<string, { name: string; cls: string }> = {
  pending: {
    name: "待处理",
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  resolved: {
    name: "已处理",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  rejected: {
    name: "已驳回",
    cls: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
  },
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter =
    (FILTERS.find((f) => f.value === sp.filter)?.value as ReportFilter) ??
    "pending";

  const rows = await listReportsForAdmin(filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">举报队列</h1>
        <p className="mt-2 text-sm text-zinc-500">
          用户对评论的举报记录。处理一次 = 标 resolved（确认违规）或 rejected（误报）。
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={
                f.value === "pending"
                  ? "/admin/reports"
                  : `/admin/reports?filter=${f.value}`
              }
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的举报
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const status = STATUS_LABEL[r.status];
            return (
              <li
                key={r.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${status.cls}`}
                  >
                    {status.name}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </span>
                  <span className="text-zinc-500">
                    {r.createdAt.toLocaleString("zh-CN", { hour12: false })}
                  </span>
                  <span className="text-zinc-500">
                    举报人: <span className="text-zinc-900 dark:text-zinc-100">{r.reporterUsername}</span>
                  </span>
                  <Link
                    href={`/models/${r.modelSlug}`}
                    target="_blank"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    → {r.modelName}
                  </Link>
                </div>

                {r.detail && (
                  <p className="mb-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    举报说明：{r.detail}
                  </p>
                )}

                {/* 被举报评论快照 */}
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-1 text-xs text-zinc-500">
                    被举报评论（{r.authorUsername}）
                    {r.commentIsHidden && <span className="ml-2 text-amber-700 dark:text-amber-400">[已隐藏]</span>}
                    {r.commentIsDeleted && <span className="ml-2 text-zinc-500">[已删除]</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-200">
                    {r.commentContent || <span className="italic text-zinc-400">（内容为空）</span>}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="text-zinc-500">
                    {r.handledAt &&
                      `处理于 ${r.handledAt.toLocaleString("zh-CN", { hour12: false })}`}
                  </div>
                  {r.status === "pending" && (
                    <ReportRowActions reportId={r.id} commentId={r.commentId} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
