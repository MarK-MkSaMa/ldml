/**
 * 公告管理列表页
 * 路径：/admin/announcements
 */
import Link from "next/link";
import { listAnnouncementsForAdmin } from "@/lib/announcements";
import { AnnouncementRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const items = await listAnnouncementsForAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">公告管理</h1>
        <Link
          href="/admin/announcements/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + 新建公告
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有公告，点右上角新建一条
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">置顶</th>
                <th className="px-4 py-3 font-medium">发布时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/announcements/${a.id}`}
                      className="font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        已发布
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        草稿
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.isPinned ? "📌" : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {a.publishedAt
                      ? a.publishedAt.toLocaleString("zh-CN", { hour12: false })
                      : "未发布"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AnnouncementRowActions
                      id={a.id}
                      isActive={a.isActive}
                      isPinned={a.isPinned}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
