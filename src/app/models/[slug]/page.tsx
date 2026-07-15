/**
 * 模型详情页
 * 路径：/models/[slug]
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserFresh } from "@/lib/current-user";
import { getModelBySlug, getModelDimensionStats } from "@/lib/models";
import { getModelVoteInsights, getUserVotesForModel } from "@/lib/votes";
import { listCommentsForModel, type CommentSort } from "@/lib/comments";
import { isSafeExternalUrl } from "@/lib/safe-url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RatingPanel } from "./rating-panel";
import { CommentsSection } from "./comments-section";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const homepageUrl = isSafeExternalUrl(model.homepageUrl) ? model.homepageUrl : null;
  const user = await getCurrentUserFresh();
  const myVotes = user ? await getUserVotesForModel(user.id, model.id) : {};
  const ratingUnlocked = Object.keys(myVotes).length > 0;
  const [dimensionStats, voteInsights] = ratingUnlocked
    ? await Promise.all([
        getModelDimensionStats(model.id),
        getModelVoteInsights(model.id),
      ])
    : [null, null];
  const ratingDimensions = model.dimensions.map((dimension) => {
    const stats = dimensionStats?.[dimension.id];
    return {
      ...dimension,
      avg: stats?.avg ?? null,
      voteCount: dimensionStats ? (stats?.voteCount ?? 0) : null,
    };
  });

  const canVote = !!user && user.trustLevel >= 1;
  let notVotableReason: string | undefined;
  if (!user) {
    notVotableReason = "登录后即可对各维度评分";
  } else if (user.trustLevel < 1) {
    notVotableReason = `你的 Linux DO 信任等级为 ${user.trustLevel}，需要达到 1 级才能投票`;
  }

  // 评论数据 + 当前用户评论权限
  const commentSort: CommentSort = sp.sort === "latest" ? "latest" : "hot";
  const comments = await listCommentsForModel(model.id, {
    sort: commentSort,
    viewerId: user?.id,
  });
  const canComment = !!user && user.trustLevel >= 1;
  let notCommentableReason: string | undefined;
  if (!user) {
    notCommentableReason = "登录后即可发表评论";
  } else if (user.trustLevel < 1) {
    notCommentableReason = `你的 Linux DO 信任等级为 ${user.trustLevel}，需要达到 1 级才能评论`;
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* 面包屑 */}
        <nav className="mb-6 text-sm text-zinc-500">
          <Link
            href={`/rankings/${model.category.slug}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← {model.category.name}
          </Link>
        </nav>

        {/* 基本信息 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <h1 className="min-w-0 break-words text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">{model.name}</h1>
              {model.status === "observing" && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  观察区
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
              {model.lab && <span className="break-words [overflow-wrap:anywhere]">来源：{model.lab}</span>}
              {model.openWeights !== null && <span>权重：{formatWeight(model.openWeights)}</span>}
            </div>
            <ModelMetadata model={model} />
          </div>

          {homepageUrl && (
            <a
              href={homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              前往查看
            </a>
          )}
        </div>

        {/* 当前评分 */}
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">当前评分</h2>
              <p className="text-xs text-zinc-500">汇总 {model.totalVotes.toLocaleString()} 条有效评分记录</p>
            </div>
            {model.officialOverall !== null && (
              <span className="text-sm text-zinc-500">
                官方综合 <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{model.officialOverall.toFixed(1)}</span>
              </span>
            )}
          </div>
          {ratingUnlocked ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[28rem] text-sm">
                <tbody>
                  {ratingDimensions.map((d, i) => (
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
                        {(d.voteCount ?? 0).toLocaleString()} 票
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 px-5 py-8 text-center dark:border-zinc-700">
              <div className="text-sm font-medium">维度评分在评分后可见</div>
              <p className="mt-1 text-xs text-zinc-500">对该模型任一维度提交评分后，即可查看维度均分与票数。</p>
            </div>
          )}
        </section>

        {/* 投票 */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">我的评分</h2>
            <p className="text-sm text-zinc-500">
              对你熟悉的维度评 1-10 分；不熟的维度可以跳过。点&quot;撤回&quot;可以删除已评分。
            </p>
          </div>
          <RatingPanel
            modelId={model.id}
            dimensions={ratingDimensions}
            initialMyVotes={myVotes}
            totalVotes={model.totalVotes}
            voteInsights={voteInsights}
            detailsUnlocked={ratingUnlocked}
            canVote={canVote}
            notVotableReason={notVotableReason}
          />
        </section>

        {/* 评论 */}
        <section className="mt-12">
          <CommentsSection
            modelId={model.id}
            initialComments={comments}
            initialSort={commentSort}
            viewer={{
              isLoggedIn: !!user,
              userId: user?.id,
              isAdmin: !!user?.isAdmin,
              canComment,
              notCommentableReason,
            }}
          />
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

type DetailModel = NonNullable<Awaited<ReturnType<typeof getModelBySlug>>>;

function ModelMetadata({ model }: { model: DetailModel }) {
  const rows = [
    { label: "上下文", value: formatTokens(model.contextTokens) },
    { label: "最大输出", value: formatTokens(model.outputTokens) },
    { label: "输入类型", value: formatList(model.inputModalities) },
    { label: "输出类型", value: formatList(model.outputModalities) },
    { label: "推理", value: model.supportsReasoning ? "支持" : "—" },
    { label: "工具调用", value: model.supportsToolCall ? "支持" : "—" },
    { label: "价格", value: formatPrice(model.price) },
    { label: "发布日期", value: model.releasedAt ?? "—" },
  ].filter((row) => row.value !== "—");

  if (rows.length === 0) return null;

  return (
    <dl className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
      {rows.map((row) => (
        <div
          key={row.label}
          className="min-w-[6.5rem] max-w-[14rem] rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <dt className="font-medium text-zinc-700 dark:text-zinc-300">{row.label}</dt>
          <dd className="mt-1 break-words [overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatWeight(openWeights: boolean): string {
  return openWeights ? "开源权重" : "闭源权重";
}

function formatTokens(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

function formatList(values: string[] | null): string {
  return values && values.length > 0 ? values.join(", ") : "—";
}

function formatPrice(price: DetailModel["price"]): string {
  if (!price) return "—";
  const parts = [
    price.input !== undefined ? `输入 $${price.input}` : null,
    price.output !== undefined ? `输出 $${price.output}` : null,
    price.cacheRead !== undefined ? `缓存读取 $${price.cacheRead}` : null,
    price.cacheWrite !== undefined ? `缓存写入 $${price.cacheWrite}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "—";
}
