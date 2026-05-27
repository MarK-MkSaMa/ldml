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
  vendor: string | null;
  licenseText: string | null;
  homepageUrl: string | null;
  releasedAt: string | null;
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
      vendor: models.vendor,
      licenseText: models.licenseText,
      homepageUrl: models.homepageUrl,
      releasedAt: models.releasedAt,
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
    vendor: m.vendor,
    licenseText: m.licenseText,
    homepageUrl: m.homepageUrl,
    releasedAt: m.releasedAt,
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
