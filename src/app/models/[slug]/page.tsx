/**
 * 模型详情页
 * 路径：/models/[slug]
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getModelBySlug } from "@/lib/models";
import { getUserVotesForModel } from "@/lib/votes";
import { SiteHeader } from "@/components/site-header";
import { RatingPanel } from "./rating-panel";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const session = await auth();
  const myVotes = session?.user
    ? await getUserVotesForModel(session.user.id, model.id)
    : {};

  const canVote = !!session?.user && session.user.trustLevel >= 1;
  let notVotableReason: string | undefined;
  if (!session?.user) {
    notVotableReason = "登录后即可对各维度评分";
  } else if (session.user.trustLevel < 1) {
    notVotableReason = `你的 Linux DO 信任等级为 ${session.user.trustLevel}，需要达到 1 级才能投票`;
  }

  // 综合分
  const weightedScores = model.dimensions
    .map((d) => d.weighted)
    .filter((v): v is number => v !== null);
  const overall =
    weightedScores.length > 0
      ? weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length
      : null;

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-4xl" />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* 面包屑 */}
        <nav className="mb-6 text-sm text-zinc-500">
          <Link
            href={`/rankings/${model.license.slug}/${model.category.slug}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← {model.license.name} · {model.category.name}
          </Link>
        </nav>

        {/* 基本信息 */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{model.name}</h1>
            {model.status === "observing" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                观察区
              </span>
            )}
          </div>
          {model.vendor && (
            <p className="text-sm text-zinc-500">{model.vendor}</p>
          )}
          {model.description && (
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">
              {model.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
            {model.params && <span>参数量：{model.params}</span>}
            {model.contextLength && (
              <span>上下文：{model.contextLength.toLocaleString()}</span>
            )}
            {model.releasedAt && <span>发布：{model.releasedAt}</span>}
          </div>
        </div>

        {/* 当前评分 */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">当前评分</h2>
            {overall !== null && (
              <span className="text-sm text-zinc-500">
                综合 <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{overall.toFixed(1)}</span>
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <tbody>
                {model.dimensions.map((d, i) => (
                  <tr
                    key={d.id}
                    className={
                      i % 2 === 0
                        ? "bg-zinc-50/50 dark:bg-zinc-900/30"
                        : ""
                    }
                  >
                    <td className="px-4 py-2">{d.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {d.avg !== null ? d.avg.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500 tabular-nums">
                      {d.voteCount.toLocaleString()} 票
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 投票 */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">我的评分</h2>
            <p className="text-sm text-zinc-500">
              对你熟悉的维度评 1-10 分；不熟的维度可以跳过。点"撤回"可以删除已评分。
            </p>
          </div>
          <RatingPanel
            modelId={model.id}
            dimensions={model.dimensions.map((d) => ({
              id: d.id,
              slug: d.slug,
              name: d.name,
              description: d.description,
            }))}
            initialMyVotes={myVotes}
            canVote={canVote}
            notVotableReason={notVotableReason}
          />
        </section>
      </div>

      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
        🚧 站点建设中
      </footer>
    </main>
  );
}
