/**
 * 排行榜查询逻辑
 *
 * 提供按 (license, category) 查询正式榜 / 观察区模型 + 各维度评分的函数
 */
import { db } from "@/db";
import {
  licenses,
  categories,
  dimensions,
  models,
  modelStats,
} from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

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
  description: string | null;
  contextLength: number | null;
  params: string | null;
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
export async function getRanking(
  licenseSlug: string,
  categorySlug: string,
): Promise<RankingData | null> {
  // 1. 查 license + category
  const [lic] = await db.select().from(licenses).where(eq(licenses.slug, licenseSlug));
  const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug));
  if (!lic || !cat) return null;

  // 2. 查该 category 的维度
  const dims = await db
    .select()
    .from(dimensions)
    .where(eq(dimensions.categoryId, cat.id))
    .orderBy(asc(dimensions.order));

  // 3. 查该 (license, category) 下所有非草稿、非归档的模型
  const modelRows = await db
    .select()
    .from(models)
    .where(and(eq(models.licenseId, lic.id), eq(models.categoryId, cat.id)));

  // 4. 查所有相关 model_stats
  const modelIds = modelRows.map((m) => m.id);
  const stats =
    modelIds.length === 0
      ? []
      : await db.select().from(modelStats); // 数据量小，全表回拉再筛
  const statsByModel = new Map<string, typeof stats>();
  for (const s of stats) {
    if (!modelIds.includes(s.modelId)) continue;
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
      description: m.description,
      contextLength: m.contextLength,
      params: m.params,
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
 * 用于生成静态路径 —— 列出所有 (license, category) 组合
 */
export async function getAllRankingPaths(): Promise<
  { license: string; category: string }[]
> {
  const ls = await db.select({ slug: licenses.slug }).from(licenses);
  const cs = await db.select({ slug: categories.slug }).from(categories);
  return ls.flatMap((l) => cs.map((c) => ({ license: l.slug, category: c.slug })));
}
