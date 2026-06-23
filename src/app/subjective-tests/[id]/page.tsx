import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUserFresh } from "@/lib/current-user";
import { isSafeExternalUrl } from "@/lib/safe-url";
import { getPublicSubjectiveTestActivityDetail } from "@/lib/subjective-tests";
import { SubjectiveVoteForm } from "../vote-form";

export const dynamic = "force-dynamic";

export default async function SubjectiveTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserFresh();
  const activity = await getPublicSubjectiveTestActivityDetail(id, user?.id);
  if (!activity) notFound();
  const canVote = Boolean(user && user.trustLevel >= 1);
  const linuxdoUrl = isSafeExternalUrl(activity.linuxdoUrl, { allowedProtocols: ["https:"], allowedHosts: ["linux.do"] })
    ? activity.linuxdoUrl
    : null;
  const userRanks = Object.fromEntries(activity.userRanks.entries());

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />
      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/subjective-tests" className="text-blue-600 hover:underline dark:text-blue-400">← 返回主观测试</Link>
        </div>

        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{activity.categoryName}</span>
            <span>{activity.voteCount} 人投票</span>
            {linuxdoUrl && (
              <a href={linuxdoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Linux DO 活动帖</a>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{activity.title}</h1>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Block title="测试需求" content={activity.requirement} />
            <Block title="结果说明" content={activity.resultNote || "暂未填写结果说明"} muted={!activity.resultNote} />
          </div>
        </div>

        {!user && (
          <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">请先登录后再提交排序投票。</p>
        )}
        {user && user.trustLevel < 1 && (
          <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">你的信任等级为 {user.trustLevel}，需要达到 1 级才能投票。</p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold">所有模型输出</h2>
              {activity.entries.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">暂未添加模型输出</p>
              ) : (
                <ul className="space-y-4">
                  {activity.entries.map((entry, index) => (
                    <li key={entry.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-semibold">{entry.modelName}</h3>
                        <span className="text-xs text-zinc-500">输出 #{index + 1}</span>
                      </div>
                      <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">{entry.output}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <SubjectiveVoteForm activityId={activity.id} entries={activity.entries} canVote={canVote} userRanks={userRanks} />
          </section>

          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">当前活动 Elo 排名</h2>
            {activity.ranking.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">暂无模型输出</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                    <tr>
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">模型</th>
                      <th className="py-2 pr-3 font-medium">Elo</th>
                      <th className="py-2 font-medium">对局</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.ranking.map((row, index) => (
                      <tr key={row.key} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                        <td className="py-2 pr-3 font-medium">{index + 1}</td>
                        <td className="py-2 pr-3 font-medium">{row.modelName}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.elo}</td>
                        <td className="py-2 tabular-nums">{row.gameCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function Block({ title, content, muted = false }: { title: string; content: string; muted?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      <div className={`whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/70 ${muted ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
        {content}
      </div>
    </div>
  );
}
