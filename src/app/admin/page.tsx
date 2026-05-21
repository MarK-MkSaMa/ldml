/**
 * 后台首页（仪表盘）
 */
import Link from "next/link";
import { getDashboardStats } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  observing: "观察区",
  listed: "正式榜",
  archived: "归档",
};

export default async function AdminHome() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>

      {/* 四个核心数字 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="注册用户" value={stats.userCount} />
        <StatCard label="模型总数" value={stats.modelCount} />
        <StatCard label="评分总数" value={stats.voteCount} />
        <StatCard label="公告数" value={stats.announcementCount} />
      </div>

      {/* 待处理事项（仅在有积压时显示） */}
      {stats.pendingReportCount > 0 && (
        <Link
          href="/admin/reports"
          className="block rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
        >
          ⚠ 有 <strong>{stats.pendingReportCount}</strong> 条待处理举报 →
        </Link>
      )}

      {/* 模型按状态分布 */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          模型状态分布
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["draft", "observing", "listed", "archived"] as const).map((s) => {
            const found = stats.modelByStatus.find((r) => r.status === s);
            return (
              <Link
                key={s}
                href={`/admin/models?status=${s}`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="text-xs text-zinc-500">{STATUS_LABEL[s]}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {found?.count ?? 0}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 最近公告 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            最近公告
          </h2>
          <Link
            href="/admin/announcements"
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            查看全部 →
          </Link>
        </div>
        {stats.recentAnnouncements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            还没有任何公告
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {stats.recentAnnouncements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/announcements/${a.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {a.isPinned && <span aria-hidden>📌</span>}
                    <span className="truncate text-sm font-medium" title={a.title}>
                      {a.title}
                    </span>
                    {a.isActive ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        已发布
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        草稿
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {a.createdAt.toLocaleDateString("zh-CN")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
