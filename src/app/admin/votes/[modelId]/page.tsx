import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelVotesForAdmin } from "@/lib/admin-votes";
import { WithdrawButton } from "../withdraw-button";

export const dynamic = "force-dynamic";

export default async function AdminModelVotesPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  const data = await getModelVotesForAdmin(modelId);
  if (!data) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/votes" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100">
          ← 返回投票管理
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.model.name} 的投票</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {data.model.vendor ?? "—"} · /{data.model.slug} · {data.category.name} · {data.model.status}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {data.users.length} 位用户
          </div>
        </div>
      </div>

      {data.users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          该模型暂无用户投票
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-max text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 font-medium dark:bg-zinc-950">
                  用户
                </th>
                {data.dimensions.map((dimension) => (
                  <th key={dimension.id} className="px-4 py-3 text-right font-medium">
                    {dimension.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.map((item) => {
                const voteByDimension = new Map(
                  item.votes.map((vote) => [vote.dimensionId, vote]),
                );
                return (
                  <tr key={item.user.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 dark:bg-zinc-900">
                      <div className="font-medium">{item.user.displayName || item.user.username}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                        <span>@{item.user.username}</span>
                        <span>· Linux DO {item.user.linuxdoId}</span>
                        <span>· TL{item.user.trustLevel}</span>
                        {item.user.isBanned ? <span className="text-red-600 dark:text-red-400">· 已封禁</span> : null}
                      </div>
                    </td>
                    {data.dimensions.map((dimension) => {
                      const vote = voteByDimension.get(dimension.id);
                      return (
                        <td key={dimension.id} className="px-4 py-3 text-right tabular-nums">
                          {vote ? (
                            <div className="flex justify-end">
                              <WithdrawButton
                                userId={item.user.id}
                                modelId={data.model.id}
                                dimensionId={dimension.id}
                                score={vote.score}
                              />
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
