/**
 * /admin/abuse —— 评分异常检测面板
 *
 * 4 个独立卡片，展示可疑模式。仅检测和提示，不做自动处理。
 */
import Link from "next/link";
import {
  detectIpClusters,
  detectModelBursts,
  detectNewUserBursts,
  detectUserBursts,
  ABUSE_THRESHOLDS as T,
} from "@/lib/admin-abuse";

export const dynamic = "force-dynamic";

export default async function AdminAbusePage() {
  const [ipClusters, modelBursts, newUserBursts, userBursts] = await Promise.all([
    detectIpClusters(),
    detectModelBursts(),
    detectNewUserBursts(),
    detectUserBursts(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">评分异常检测</h1>
        <p className="mt-2 text-sm text-zinc-500">
          基于历史数据扫描可疑模式。**仅检测和提示**，不会自动撤销任何投票，由管理员人工判断处理。
        </p>
      </div>

      {/* 卡片 1：同 IP 集中操作 */}
      <Card
        title={`同 IP 集中操作（过去 ${T.RECENT_WINDOW_HOURS}h 内 ≥ ${T.IP_THRESHOLD} 次）`}
        empty={ipClusters.length === 0}
        emptyText="未发现可疑 IP"
      >
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">IP Hash（前 16 位）</th>
              <th className="px-3 py-2 font-medium">操作数</th>
              <th className="px-3 py-2 font-medium">涉及账号</th>
              <th className="px-3 py-2 font-medium">最后操作</th>
            </tr>
          </thead>
          <tbody>
            {ipClusters.map((r) => (
              <tr key={r.ipHash} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {r.ipHash.slice(0, 16)}…
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{r.count}</td>
                <td className="px-3 py-2 text-xs">
                  {r.users.length === 0 ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.users.map((u) => (
                        <Link
                          key={u.id}
                          href={`/admin/users?q=${encodeURIComponent(u.username)}`}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          {u.username}
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.lastSeen.toLocaleString("zh-CN", { hour12: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 卡片 2：模型短时爆发 */}
      <Card
        title={`模型短时极端评分爆发（过去 ${T.HOT_WINDOW_HOURS}h 内某模型获 ≥ ${T.MODEL_BURST_THRESHOLD} 张全 1 / 全 10 分）`}
        empty={modelBursts.length === 0}
        emptyText="无模型爆发现象"
      >
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">模型</th>
              <th className="px-3 py-2 font-medium">分数</th>
              <th className="px-3 py-2 font-medium">票数</th>
              <th className="px-3 py-2 font-medium">独立用户</th>
            </tr>
          </thead>
          <tbody>
            {modelBursts.map((r) => (
              <tr
                key={`${r.modelId}-${r.score}`}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/models/${r.modelSlug}`}
                    target="_blank"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.modelName}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.score === 10
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {r.score} 分
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{r.count}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {r.uniqueUsers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 卡片 3：新账号高频投票 */}
      <Card
        title={`新账号高频投票（注册 ≤ ${T.NEW_USER_DAYS} 天 且 投票 ≥ ${T.NEW_USER_VOTE_THRESHOLD} 票）`}
        empty={newUserBursts.length === 0}
        emptyText="未发现"
      >
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">用户</th>
              <th className="px-3 py-2 font-medium">信任</th>
              <th className="px-3 py-2 font-medium">注册时间</th>
              <th className="px-3 py-2 font-medium">投票数</th>
            </tr>
          </thead>
          <tbody>
            {newUserBursts.map((r) => (
              <tr key={r.userId} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(r.username)}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.username}
                  </Link>
                  <div className="text-xs text-zinc-500">ID: {r.linuxdoId}</div>
                </td>
                <td className="px-3 py-2 text-xs">Lv {r.trustLevel}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.createdAt.toLocaleString("zh-CN", { hour12: false })}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{r.voteCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 卡片 4：用户短时密集投票 */}
      <Card
        title={`用户短时密集投票（过去 ${T.HOT_WINDOW_HOURS}h 内 ≥ ${T.USER_BURST_THRESHOLD} 次投票操作）`}
        empty={userBursts.length === 0}
        emptyText="未发现"
      >
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">用户</th>
              <th className="px-3 py-2 font-medium">操作数</th>
              <th className="px-3 py-2 font-medium">最近操作</th>
            </tr>
          </thead>
          <tbody>
            {userBursts.map((r) => (
              <tr key={r.userId} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(r.username)}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.username}
                  </Link>
                  <div className="text-xs text-zinc-500">ID: {r.linuxdoId}</div>
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">{r.count}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.lastAt.toLocaleString("zh-CN", { hour12: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Card({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium">{title}</h2>
      </header>
      <div className="overflow-x-auto px-1 py-1">
        {empty ? (
          <p className="px-4 py-6 text-sm text-zinc-500">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
