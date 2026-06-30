/**
 * 模型详情查询
 */
import { db } from "@/db";
import {
  models,
  categories,
  dimensions,
  modelStats,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";

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
  dimensions: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    avg: number | null;
    weighted: number | null;
    voteCount: number;
  }[];
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

  const dims = await db
    .select()
    .from(dimensions)
    .where(eq(dimensions.categoryId, cat.id))
    .orderBy(asc(dimensions.order));

  // 一并查 model_stats
  const stats = await db
    .select()
    .from(modelStats)
    .where(eq(modelStats.modelId, m.id));
  const statsByDim = new Map(stats.map((s) => [s.dimensionId, s]));

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
    dimensions: dims.map((d) => {
      const s = statsByDim.get(d.id);
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        avg: s?.avgScore !== undefined && s?.avgScore !== null ? Number(s.avgScore) : null,
        weighted:
          s?.weightedScore !== undefined && s?.weightedScore !== null
            ? Number(s.weightedScore)
            : null,
        voteCount: s?.voteCount ?? 0,
      };
    }),
  };
}
