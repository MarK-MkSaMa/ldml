import Link from "next/link";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isSafeExternalUrl } from "@/lib/safe-url";
import {
  getSubjectiveTestEloLeaderboard,
  listPublicSubjectiveTestActivities,
  listSubjectiveTestCategories,
} from "@/lib/subjective-tests";

export const dynamic = "force-dynamic";

export default async function SubjectiveTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const categories = await listSubjectiveTestCategories();
  const selected = categories.some((category) => category.slug === sp.category)
    ? sp.category
    : categories[0]?.slug;
  const [leaderboard, activities] = await Promise.all([
    getSubjectiveTestEloLeaderboard(selected),
    listPublicSubjectiveTestActivities(selected),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />
      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">投票活动</h2>
            {activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
                暂时没有已发布的主观测试活动
              </p>
            ) : (
              <ul className="space-y-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>{Number(activity.voteCount)} 人投票</span>
                      <span>{formatDate(activity.createdAt)}</span>
                    </div>
                    <h3 className="text-xl font-semibold">
                      <Link href={`/subjective-tests/${activity.id}`} className="hover:underline">{activity.title}</Link>
                    </h3>
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{activity.requirement}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <Link href={`/subjective-tests/${activity.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">查看详情并投票</Link>
                      {isSafeExternalUrl(activity.linuxdoUrl, { allowedProtocols: ["https:"], allowedHosts: ["linux.do"] }) && (
                        <a href={activity.linuxdoUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:underline">Linux DO 活动帖</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside id="elo-ranking" className="h-fit scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">分类 Elo 排行榜</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {categories.map((category) => (
                <FilterLink
                  key={category.id}
                  href={`/subjective-tests?category=${category.slug}`}
                  active={selected === category.slug}
                >
                  {category.name}
                </FilterLink>
              ))}
            </div>
            {leaderboard.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">暂无投票数据</p>
            ) : (
              <Leaderboard rows={leaderboard} />
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
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

function Leaderboard({ rows }: { rows: Awaited<ReturnType<typeof getSubjectiveTestEloLeaderboard>> }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
          <tr>
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">模型</th>
            <th className="py-2 pr-3 font-medium">Elo</th>
            <th className="py-2 pr-3 font-medium">对局</th>
            <th className="py-2 font-medium">活动</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
              <td className="py-2 pr-3 font-medium">{index + 1}</td>
              <td className="py-2 pr-3">
                <div className="font-medium">{row.modelName}</div>
                <div className="text-xs text-zinc-500">{row.categoryName}</div>
              </td>
              <td className="py-2 pr-3 tabular-nums">{row.elo}</td>
              <td className="py-2 pr-3 tabular-nums">{row.gameCount}</td>
              <td className="py-2 tabular-nums">{row.activityCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
