/**
 * 排行榜主页
 * 路径：/rankings/[license]
 *
 * 注意：目录名沿用 [license] 是为了兼容旧的 /rankings/[license]/[category]
 * 路由结构；这里的单段参数实际表示 category：text | image | video。
 */
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getCurrentUserFresh } from "@/lib/current-user";
import { getRanking, getRankingForViewer } from "@/lib/rankings";
import { getUserRatedModelIds } from "@/lib/votes";
import { RankingTable } from "./[category]/ranking-table";
import { ObservingSection } from "./[category]/observing-section";
import { RankingsShell } from "./[category]/rankings-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementBanner } from "@/components/announcement-banner";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  params,
}: {
  params: Promise<{ license: string }>;
}) {
  const { license: category } = await params;
  const [data, categoryTabs, user] = await Promise.all([
    getRanking(category),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.order)),
    getCurrentUserFresh(),
  ]);
  if (!data) notFound();

  const modelIds = [...data.listed, ...data.observing].map((model) => model.id);
  const ratedModelIds = user
    ? await getUserRatedModelIds(user.id, modelIds)
    : new Set<string>();
  const viewerData = await getRankingForViewer(data, ratedModelIds);
  let hintText: string;
  if (!user) {
    hintText = "💡 点击任意一行查看模型详情并评分 · 需先登录 Linux DO";
  } else if (user.trustLevel < 1) {
    hintText = `💡 点击任意一行查看模型详情 · 你的信任等级 ${user.trustLevel} 暂不能评分（需达到 1 级）`;
  } else {
    hintText = "💡 点击任意一行进入模型详情并对各维度评分";
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />

      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <RankingsShell
          category={category}
          hintText={hintText}
          categoryTabs={categoryTabs}
        >
          {viewerData.observing.length > 0 && (
            <ObservingSection
              dimensions={viewerData.dimensions}
              models={viewerData.observing}
            />
          )}

          {viewerData.listed.length === 0 ? (
            <p className="py-12 text-center text-zinc-500">暂无模型上榜</p>
          ) : (
            <RankingTable
              dimensions={viewerData.dimensions}
              models={viewerData.listed}
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
