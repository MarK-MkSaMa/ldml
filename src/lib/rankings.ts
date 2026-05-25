/**
 * 排行榜查询逻辑
 *
 * 提供按 (license, category) 查询正式榜 / 观察区模型 + 各维度评分的函数
 */
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import {
  licenses,
  categories,
  dimensions,
  models,
  modelStats,
} from "@/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
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
  vendor: string | null;
  status: "draft" | "observing" | "listed" | "archived";
  pinned: boolean;
  publishedAt: Date | null;
  // dimensionId -> { avg, weighted, count }
  scores: Record<number, { avg: number | null; weighted: number | null; count: number }>;
  // 综合分（各维度 weighted 的简单平均，null 不计入）
  overall: number | null;
  // 总票数（最大维度票数，作为粗略指标）
  totalVotes: number;
};

export type RankingData = {
  license: { slug: string; name: string };
  category: { slug: string; name: string };
  dimensions: DimensionInfo[];
  listed: ModelRow[];
  observing: ModelRow[];
};

/**
 * 加载某 (license, category) 下的排行榜数据
 * 返回 null 表示 license 或 category slug 不存在
 */
async function getRankingUncached(
  licenseSlug: string,
  categorySlug: string,
): Promise<RankingData | null> {
  // 阶段 1：并发查 license + category（两条 SQL 同时发）
  const [licRows, catRows] = await Promise.all([
    db.select().from(licenses).where(eq(licenses.slug, licenseSlug)),
    db.select().from(categories).where(eq(categories.slug, categorySlug)),
  ]);
  const lic = licRows[0];
  const cat = catRows[0];
  if (!lic || !cat) return null;

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
      .where(and(eq(models.licenseId, lic.id), eq(models.categoryId, cat.id))),
  ]);

  // 阶段 3：查相关 model_stats（用 IN 过滤，DB 端就筛好，不再拉全表）
  const modelIds = modelRows.map((m) => m.id);
  const stats =
    modelIds.length === 0
      ? []
      : await db
          .select()
          .from(modelStats)
          .where(inArray(modelStats.modelId, modelIds));

  const statsByModel = new Map<string, typeof stats>();
  for (const s of stats) {
    const arr = statsByModel.get(s.modelId) ?? [];
    arr.push(s);
    statsByModel.set(s.modelId, arr);
  }

  // 5. 组合
  const enrich = (m: (typeof modelRows)[number]): ModelRow => {
    const myStats = statsByModel.get(m.id) ?? [];
    const scores: ModelRow["scores"] = {};
    let weightedSum = 0;
    let weightedCount = 0;
    let totalVotes = 0;
    for (const s of myStats) {
      const avg = s.avgScore !== null ? Number(s.avgScore) : null;
      const weighted = s.weightedScore !== null ? Number(s.weightedScore) : null;
      scores[s.dimensionId] = { avg, weighted, count: s.voteCount };
      if (weighted !== null) {
        weightedSum += weighted;
        weightedCount++;
      }
      if (s.voteCount > totalVotes) totalVotes = s.voteCount;
    }
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      vendor: m.vendor,
      status: m.status,
      pinned: m.pinned,
      publishedAt: m.publishedAt,
      scores,
      overall: weightedCount > 0 ? weightedSum / weightedCount : null,
      totalVotes,
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
    license: { slug: lic.slug, name: lic.name },
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
 * 用于生成静态路径 —— 列出所有 (license, category) 组合
 */
export async function getAllRankingPaths(): Promise<
  { license: string; category: string }[]
> {
  const ls = await db.select({ slug: licenses.slug }).from(licenses);
  const cs = await db.select({ slug: categories.slug }).from(categories);
  return ls.flatMap((l) => cs.map((c) => ({ license: l.slug, category: c.slug })));
}
