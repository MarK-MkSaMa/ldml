/**
 * 模型详情查询
 */
import { db } from "@/db";
import {
  models,
  categories,
  dimensions,
  modelStats,
  votes,
} from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";

export type ModelDetail = {
  id: string;
  slug: string;
  name: string;
  lab: string | null;
  homepageUrl: string | null;
  releasedAt: string | null;
  contextTokens: number | null;
  outputTokens: number | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportsReasoning: boolean;
  supportsToolCall: boolean;
  openWeights: boolean | null;
  price: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  } | null;
  status: "draft" | "observing" | "listed" | "archived";
  category: { slug: string; name: string };
  officialOverall: number | null;
  totalVotes: number;
  dimensions: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
  }[];
};

export type ModelDimensionStat = {
  avg: number | null;
  weighted: number | null;
  voteCount: number;
};

export async function getModelBySlug(slug: string): Promise<ModelDetail | null> {
  const [m] = await db
    .select({
      id: models.id,
      slug: models.slug,
      name: models.name,
      lab: models.lab,
      vendor: models.vendor,
      homepageUrl: models.homepageUrl,
      releasedAt: models.releasedAt,
      contextTokens: models.contextTokens,
      outputTokens: models.outputTokens,
      inputModalities: models.inputModalities,
      outputModalities: models.outputModalities,
      supportsReasoning: models.supportsReasoning,
      supportsToolCall: models.supportsToolCall,
      openWeights: models.openWeights,
      price: models.price,
      status: models.status,
      categoryId: models.categoryId,
    })
    .from(models)
    .where(eq(models.slug, slug));
  if (!m) return null;

  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, m.categoryId));
  if (!cat) return null;

  const [dims, overallRows, summaryRows] = await Promise.all([
    db
      .select()
      .from(dimensions)
      .where(eq(dimensions.categoryId, cat.id))
      .orderBy(asc(dimensions.order)),
    db
      .select({
        overall: sql<string | null>`avg(${modelStats.avgScore})`,
      })
      .from(modelStats)
      .innerJoin(dimensions, eq(dimensions.id, modelStats.dimensionId))
      .where(
        and(
          eq(modelStats.modelId, m.id),
          eq(dimensions.categoryId, m.categoryId),
        ),
      ),
    db
      .select({ totalVotes: sql<number>`count(*)::int` })
      .from(votes)
      .innerJoin(dimensions, eq(dimensions.id, votes.dimensionId))
      .where(
        and(
          eq(votes.modelId, m.id),
          eq(dimensions.categoryId, m.categoryId),
        ),
      ),
  ]);

  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    lab: m.lab ?? m.vendor,
    homepageUrl: m.homepageUrl,
    releasedAt: m.releasedAt,
    contextTokens: m.contextTokens,
    outputTokens: m.outputTokens,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    supportsReasoning: m.supportsReasoning,
    supportsToolCall: m.supportsToolCall,
    openWeights: m.openWeights,
    price: m.price,
    status: m.status,
    category: { slug: cat.slug, name: cat.name },
    officialOverall:
      overallRows[0]?.overall !== null && overallRows[0]?.overall !== undefined
        ? Number(overallRows[0].overall)
        : null,
    totalVotes: Number(summaryRows[0]?.totalVotes ?? 0),
    dimensions: dims.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      description: d.description,
    })),
  };
}

/**
 * 仅供已解锁查看者查询逐维度社区统计。
 */
export async function getModelDimensionStats(
  modelId: string,
): Promise<Record<number, ModelDimensionStat>> {
  const rows = await db
    .select({
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
        eq(modelStats.modelId, modelId),
        eq(models.categoryId, dimensions.categoryId),
      ),
    );

  return Object.fromEntries(
    rows.map((row) => [
      row.dimensionId,
      {
        avg: row.avgScore !== null ? Number(row.avgScore) : null,
        weighted: row.weightedScore !== null ? Number(row.weightedScore) : null,
        voteCount: row.voteCount,
      },
    ]),
  );
}
