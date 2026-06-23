import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBenchmarkLeaderboard } from "@/lib/benchmarks";
import { BenchmarkTabs } from "./benchmark-tabs";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  const leaderboard = await getBenchmarkLeaderboard();

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <BenchmarkTabs active="leaderboard" />

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold">模型基准测试排行榜</h2>
          {leaderboard.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              暂时还没有测试结果
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 pr-4 font-medium">排名</th>
                    <th className="py-3 pr-4 font-medium">模型</th>
                    <th className="py-3 pr-4 font-medium">正确数</th>
                    <th className="py-3 pr-4 font-medium">错误数</th>
                    <th className="py-3 pr-4 font-medium">已测试题数</th>
                    <th className="py-3 font-medium">正确率</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => (
                    <tr key={row.modelName} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                      <td className="py-3 pr-4 font-medium">#{index + 1}</td>
                      <td className="py-3 pr-4 font-medium">{row.modelName}</td>
                      <td className="py-3 pr-4 text-green-700 dark:text-green-400">{row.correctCount}</td>
                      <td className="py-3 pr-4 text-red-600 dark:text-red-400">{row.wrongCount}</td>
                      <td className="py-3 pr-4">{row.totalCount}</td>
                      <td className="py-3">{formatRate(row.correctRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
