/**
 * /admin/users —— 用户管理
 */
import Link from "next/link";
import { listUsersForAdmin, type UserFilter } from "@/lib/admin-users";
import { UserRowActions } from "./row-actions";
import { requireAdminFresh } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "admin", label: "管理员" },
  { value: "banned", label: "已封禁" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filter =
    (FILTERS.find((f) => f.value === sp.filter)?.value as UserFilter) ?? "all";
  const search = sp.q?.trim() ?? "";

  const [rows, admin] = await Promise.all([
    listUsersForAdmin(filter, search),
    requireAdminFresh(),
  ]);
  const selfId = admin.id;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
        <p className="mt-2 text-sm text-zinc-500">
          搜索用户、封禁刷票账号、调整管理员权限。
        </p>
      </div>

      {/* 筛选 + 搜索 */}
      <form
        action="/admin/users"
        method="get"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Link
                key={f.value}
                href={
                  f.value === "all"
                    ? search
                      ? `/admin/users?q=${encodeURIComponent(search)}`
                      : "/admin/users"
                    : `/admin/users?filter=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`
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
        <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
          {filter !== "all" && (
            <input type="hidden" name="filter" value={filter} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="用户名 或 Linux DO ID"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none sm:w-64 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            搜索
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的用户
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">信任</th>
                <th className="px-4 py-3 font-medium">活跃</th>
                <th className="px-4 py-3 font-medium">最近登录</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">{u.username}</span>
                          {u.isAdmin && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                              管理员
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              已封禁
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Linux DO ID: {u.linuxdoId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    Lv {u.trustLevel}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col gap-0.5 text-zinc-600 dark:text-zinc-400">
                      <span>评分 {u.voteCount}</span>
                      <span>评论 {u.commentCount}</span>
                      {u.reportCount > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          被举报 {u.reportCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {u.lastLoginAt
                      ? u.lastLoginAt.toLocaleString("zh-CN", {
                          hour12: false,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserRowActions
                      userId={u.id}
                      isAdmin={u.isAdmin}
                      isBanned={u.isBanned}
                      isSelf={u.id === selfId}
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
