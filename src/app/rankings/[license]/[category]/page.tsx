/**
 * 排行榜主页
 * 路径：/rankings/[license]/[category]
 *   license:  open-source | closed-source
 *   category: text | image | video
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getRanking } from "@/lib/rankings";
import { RankingTable } from "./ranking-table";
import { SessionMenu } from "@/components/session-menu";
import { AnnouncementBanner } from "@/components/announcement-banner";

// 因为顶部 SessionMenu 依赖 cookie（每用户不同），整页需动态渲染
// 后续若性能成为瓶颈，可只缓存排行数据本身、SessionMenu 走客户端获取
export const dynamic = "force-dynamic";

const LICENSE_TABS = [
  { slug: "closed-source", name: "非开源" },
  { slug: "open-source", name: "开源" },
];
const CATEGORY_TABS = [
  { slug: "text", name: "文字" },
  { slug: "image", name: "生图" },
  { slug: "video", name: "生视频" },
];

export default async function RankingPage({
  params,
}: {
  params: Promise<{ license: string; category: string }>;
}) {
  const { license, category } = await params;
  const data = await getRanking(license, category);
  if (!data) notFound();

  const session = await auth();
  let hintText: string;
  if (!session?.user) {
    hintText = "💡 点击任意一行查看模型详情并评分 · 需先登录 Linux DO";
  } else if (session.user.trustLevel < 1) {
    hintText = `💡 点击任意一行查看模型详情 · 你的信任等级 ${session.user.trustLevel} 暂不能评分（需达到 1 级）`;
  } else {
    hintText = "💡 点击任意一行进入模型详情并对各维度评分";
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* 顶部站点导航 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            LDML 大模型排行榜
          </Link>
          <SessionMenu />
        </div>
      </header>

      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* 大类 Tab */}
        <nav className="mb-4 flex gap-2">
          {LICENSE_TABS.map((tab) => {
            const active = tab.slug === license;
            return (
              <Link
                key={tab.slug}
                href={`/rankings/${tab.slug}/${category}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>

        {/* 分类 Tab */}
        <nav className="mb-8 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
          {CATEGORY_TABS.map((tab) => {
            const active = tab.slug === category;
            return (
              <Link
                key={tab.slug}
                href={`/rankings/${license}/${tab.slug}`}
                className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>

        {/* 引导条 */}
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          {hintText}
        </div>

        {/* 观察区 */}
        {data.observing.length > 0 && (
          <section className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <h2 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-200">
              🆕 观察区（{data.observing.length} 个新模型，暂不计入排行）
            </h2>
            <RankingTable
              dimensions={data.dimensions}
              models={data.observing}
              showOverall={false}
            />
          </section>
        )}

        {/* 正式榜 */}
        {data.listed.length === 0 ? (
          <p className="py-12 text-center text-zinc-500">暂无模型上榜</p>
        ) : (
          <RankingTable
            dimensions={data.dimensions}
            models={data.listed}
            showOverall={true}
          />
        )}
      </div>

      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
        🚧 站点建设中 · 数据来自 Linux DO 社区用户投票
      </footer>
    </main>
  );
}
