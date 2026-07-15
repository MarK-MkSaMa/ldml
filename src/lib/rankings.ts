/**
 * 排行榜查询逻辑
 *
 * 提供按 (license, category) 查询正式榜 / 观察区模型 + 各维度评分的函数
 */
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import {
  categories,
  dimensions,
  models,
  modelStats,
} from "@/db/schema";
import { and, eq, asc, inArray, sql } from "drizzle-orm";
import { recomputeStatsIfStale } from "./stats-refresh";

export type DimensionInfo = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export type ModelRow = {
  id: string;
  slug: string;
  name: string;
  lab: string | null;
  openWeights: boolean | null;
  status: "draft" | "observing" | "listed" | "archived";
  pinned: boolean;
  releasedAt: string | null;
  publishedAt: Date | null;
  // 当前查看者是否已对该模型留下至少一条有效评分
  ratingUnlocked: boolean;
  // dimensionId -> { avg, weighted, count }；未解锁时服务端返回空对象
  scores: Record<number, { avg: number | null; weighted: number | null; count: number }>;
  // 官方综合分（各维度 avg 的简单平均，null 不计入）
  overall: number | null;
  // 总票数（最大维度票数，作为粗略指标）
  totalVotes: number;
};

export type RankingData = {
  category: { slug: string; name: string };
  dimensions: DimensionInfo[];
  listed: ModelRow[];
  observing: ModelRow[];
};

/**
 * 加载某 category 下的排行榜数据
 * 返回 null 表示 category slug 不存在
 */
async function getRankingUncached(
  categorySlug: string,
): Promise<RankingData | null> {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug));
  if (!cat) return null;

  // 阶段 2：并发查 dimensions + models（依赖阶段 1 的 ids）
  const [dims, modelRows] = await Promise.all([
    db
      .select()
      .from(dimensions)
      .where(eq(dimensions.categoryId, cat.id))
      .orderBy(asc(dimensions.order)),
    db
      .select()
      .from(models)
      .where(eq(models.categoryId, cat.id)),
  ]);

  // 阶段 3：只查询公开聚合，逐维度统计留到确认查看者已评分后再加载
  const modelIds = modelRows.map((m) => m.id);
  const aggregateRows =
    modelIds.length === 0
      ? []
      : await db
          .select({
            modelId: modelStats.modelId,
            overall: sql<string | null>`avg(${modelStats.avgScore})`,
            totalVotes: sql<number>`coalesce(max(${modelStats.voteCount}), 0)::int`,
          })
          .from(modelStats)
          .innerJoin(models, eq(models.id, modelStats.modelId))
          .innerJoin(dimensions, eq(dimensions.id, modelStats.dimensionId))
          .where(
            and(
              inArray(modelStats.modelId, modelIds),
              eq(models.categoryId, dimensions.categoryId),
            ),
          )
          .groupBy(modelStats.modelId);
  const aggregatesByModel = new Map(
    aggregateRows.map((row) => [row.modelId, row]),
  );

  // 5. 组合
  const enrich = (m: (typeof modelRows)[number]): ModelRow => {
    const aggregate = aggregatesByModel.get(m.id);
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      lab: m.lab ?? m.vendor,
      openWeights: m.openWeights,
      status: m.status,
      pinned: m.pinned,
      releasedAt: m.releasedAt,
      publishedAt: m.publishedAt,
      ratingUnlocked: false,
      scores: {},
      overall:
        aggregate?.overall !== null && aggregate?.overall !== undefined
          ? Number(aggregate.overall)
          : null,
      totalVotes: Number(aggregate?.totalVotes ?? 0),
    };
  };

  const all = modelRows.map(enrich);
  const listed = all
    .filter((m) => m.status === "listed")
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
  const observing = all
    .filter((m) => m.status === "observing")
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  // 响应返回后，异步检查 model_stats 是否 stale（因时间衰减需重算）
  // 不阻塞当前响应；下次访问就能拿到新分数
  try {
    after(() => {
      recomputeStatsIfStale().catch((e) =>
        console.error("[stats-refresh]", e),
      );
    });
  } catch {
    // after() 不能在所有上下文里调用（如在非请求范围调用 getRanking 时）
    // 失败就跳过，下次有真实请求时再触发
  }

  return {
    category: { slug: cat.slug, name: cat.name },
    dimensions: dims.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      description: d.description,
    })),
    listed,
    observing,
  };
}

/**
 * 缓存版排行榜查询
 *
 * - 缓存 60 秒，第一个用户付出真实查询代价，后 60 秒内秒回
 * - tag "rankings"：投票成功 / 模型变更 / 维度变更时调用 revalidateTag("rankings") 立即失效
 */
export const getRanking = unstable_cache(
  getRankingUncached,
  ["rankings"],
  { revalidate: 60, tags: ["rankings"] },
);

/**
 * 按当前查看者权限克隆排行榜数据，并在服务端移除未解锁模型的维度明细。
 */
export async function getRankingForViewer(
  data: RankingData,
  ratedModelIds: ReadonlySet<string>,
): Promise<RankingData> {
  const rows = [...data.listed, ...data.observing];
  const unlockedModelIds = rows
    .map((row) => row.id)
    .filter((modelId) => ratedModelIds.has(modelId));
  const statRows = unlockedModelIds.length === 0
    ? []
    : await db
        .select({
          modelId: modelStats.modelId,
          dimensionId: modelStats.dimensionId,
          avgScore: modelStats.avgScore,
          weightedScore: modelStats.weightedScore,
          voteCount: modelStats.voteCount,
        })
        .from(modelStats)
        .innerJoin(models, eq(models.id, modelStats.modelId))
        .innerJoin(dimensions, eq(dimensions.id, modelStats.dimensionId))
        .where(
          and(
            inArray(modelStats.modelId, unlockedModelIds),
            eq(models.categoryId, dimensions.categoryId),
          ),
        );
  const scoresByModel = new Map<string, ModelRow["scores"]>();
  for (const stat of statRows) {
    const scores = scoresByModel.get(stat.modelId) ?? {};
    scores[stat.dimensionId] = {
      avg: stat.avgScore !== null ? Number(stat.avgScore) : null,
      weighted: stat.weightedScore !== null ? Number(stat.weightedScore) : null,
      count: stat.voteCount,
    };
    scoresByModel.set(stat.modelId, scores);
  }

  const prepareRows = (modelRows: ModelRow[]) => modelRows.map((row) => {
    const ratingUnlocked = ratedModelIds.has(row.id);
    return {
      ...row,
      ratingUnlocked,
      scores: ratingUnlocked ? (scoresByModel.get(row.id) ?? {}) : {},
    };
  });

  return {
    ...data,
    category: { ...data.category },
    dimensions: data.dimensions.map((dimension) => ({ ...dimension })),
    listed: prepareRows(data.listed),
    observing: prepareRows(data.observing),
  };
}

/**
 * 用于生成静态路径 —— 列出所有 category
 */
export async function getAllRankingPaths(): Promise<{ category: string }[]> {
  const cs = await db.select({ slug: categories.slug }).from(categories);
  return cs.map((c) => ({ category: c.slug }));
}
