/**
 * 排行榜主页
 * 路径：/rankings/[license]/[category]
 *   license:  open-source | closed-source
 *   category: text | image | video
 */
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getRanking } from "@/lib/rankings";
import { RankingTable } from "./ranking-table";
import { ObservingSection } from "./observing-section";
import { RankingsShell } from "./rankings-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementBanner } from "@/components/announcement-banner";

// 因为顶部 SessionMenu 依赖 cookie（每用户不同），整页需动态渲染
// 后续若性能成为瓶颈，可只缓存排行数据本身、SessionMenu 走客户端获取
export const dynamic = "force-dynamic";

export default async function RankingPage({
  params,
}: {
  params: Promise<{ license: string; category: string }>;
}) {
  const { license, category } = await params;
  const [data, categoryTabs] = await Promise.all([
    getRanking(license, category),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.order)),
  ]);
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
      <SiteHeader maxWidth="max-w-6xl" />

      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <RankingsShell
          license={license}
          category={category}
          hintText={hintText}
          categoryTabs={categoryTabs}
        >
          {/* 观察区 */}
          {data.observing.length > 0 && (
            <ObservingSection
              dimensions={data.dimensions}
              models={data.observing}
            />
          )}

          {/* 正式榜 */}
          {data.listed.length === 0 ? (
            <p className="py-12 text-center text-zinc-500">暂无模型上榜</p>
          ) : (
            <RankingTable
              dimensions={data.dimensions}
              models={data.listed}
              showOverall={true}
              storageKey={category}
            />
          )}
        </RankingsShell>
      </div>

      <SiteFooter />
    </main>
  );
}
