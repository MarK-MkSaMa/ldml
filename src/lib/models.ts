/**
 * 模型详情查询
 */
import { db } from "@/db";
import {
  models,
  licenses,
  categories,
  dimensions,
  modelStats,
} from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type ModelDetail = {
  id: string;
  slug: string;
  name: string;
  vendor: string | null;
  description: string | null;
  contextLength: number | null;
  params: string | null;
  releasedAt: string | null;
  status: "draft" | "observing" | "listed" | "archived";
  license: { slug: string; name: string };
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
      vendor: models.vendor,
      description: models.description,
      contextLength: models.contextLength,
      params: models.params,
      releasedAt: models.releasedAt,
      status: models.status,
      licenseId: models.licenseId,
      categoryId: models.categoryId,
    })
    .from(models)
    .where(eq(models.slug, slug));
  if (!m) return null;

  const [lic] = await db.select().from(licenses).where(eq(licenses.id, m.licenseId));
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, m.categoryId));
  if (!lic || !cat) return null;

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

  // 抑制 unused 警告
  void and;

  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    vendor: m.vendor,
    description: m.description,
    contextLength: m.contextLength,
    params: m.params,
    releasedAt: m.releasedAt,
    status: m.status,
    license: { slug: lic.slug, name: lic.name },
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
