/**
 * /admin/comments —— 评论审核
 *
 * 默认显示有举报的评论。可切换 filter 查看全部 / 已隐藏 / 已删除
 */
import Link from "next/link";
import { listCommentsForAdmin, type CommentFilter } from "@/lib/admin-comments";
import { CommentReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

const FILTERS: { value: CommentFilter; label: string }[] = [
  { value: "reported", label: "有举报" },
  { value: "hidden", label: "已隐藏" },
  { value: "deleted", label: "已删除" },
  { value: "all", label: "全部" },
];

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter =
    (FILTERS.find((f) => f.value === sp.filter)?.value as CommentFilter) ??
    "reported";

  const rows = await listCommentsForAdmin(filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">评论审核</h1>
        <p className="mt-2 text-sm text-zinc-500">
          管理被举报、被隐藏或被删除的评论。每条最多展示 100 行。
        </p>
      </div>

      {/* 筛选 chip */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "reported" ? "/admin/comments" : `/admin/comments?filter=${f.value}`}
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
          没有匹配的评论
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* meta */}
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-xs">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {c.authorUsername}
                </span>
                {c.authorIsAdmin && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    管理员
                  </span>
                )}
                <span className="text-zinc-500">
                  {c.createdAt.toLocaleString("zh-CN", { hour12: false })}
                </span>
                <Link
                  href={`/models/${c.modelSlug}`}
                  target="_blank"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  → {c.modelName}
                </Link>
                {c.reportCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    举报 {c.reportCount}
                  </span>
                )}
                {c.isHidden && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    隐藏中
                  </span>
                )}
                {c.isDeleted && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    已删除
                  </span>
                )}
              </div>

              {/* 内容 */}
              <div
                className="markdown-body text-sm"
                dangerouslySetInnerHTML={{ __html: c.contentHtml }}
              />

              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-zinc-500">
                  👍 {c.likeCount} · 👎 {c.dislikeCount}
                </div>
                <CommentReviewActions
                  commentId={c.id}
                  isHidden={c.isHidden}
                  isDeleted={c.isDeleted}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
