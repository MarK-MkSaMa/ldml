/**
 * 分类管理服务（后台用）
 *
 * 分类对应"模型类型"，如 文字 / 生图 / 生视频 / 音频 等。
 */
import { db } from "@/db";
import {
  categories,
  models,
  dimensions,
} from "@/db/schema";
import { asc, count, eq, inArray } from "drizzle-orm";

export type AdminCategoryRow = {
  id: number;
  slug: string;
  name: string;
  order: number;
  modelCount: number;
  dimensionCount: number;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_MAX = 40;
const NAME_MAX = 30;

export type CategoryInput = {
  slug: string;
  name: string;
  order: number;
};

function validate(input: CategoryInput): void {
  if (!input.slug?.trim()) throw new Error("slug 不能为空");
  if (input.slug.length > SLUG_MAX)
    throw new Error(`slug 超过 ${SLUG_MAX} 字符`);
  if (!SLUG_RE.test(input.slug))
    throw new Error("slug 只能包含小写字母、数字和连字符，且以字母或数字开头");
  if (!input.name?.trim()) throw new Error("名称不能为空");
  if (input.name.length > NAME_MAX)
    throw new Error(`名称超过 ${NAME_MAX} 字符`);
  if (!Number.isInteger(input.order)) throw new Error("排序号必须是整数");
}

export async function listCategoriesForAdmin(): Promise<AdminCategoryRow[]> {
  const cats = await db.select().from(categories).orderBy(asc(categories.order));
  if (cats.length === 0) return [];

  const ids = cats.map((c) => c.id);

  const [modelStats, dimStats] = await Promise.all([
    db
      .select({ categoryId: models.categoryId, value: count() })
      .from(models)
      .where(inArray(models.categoryId, ids))
      .groupBy(models.categoryId),
    db
      .select({ categoryId: dimensions.categoryId, value: count() })
      .from(dimensions)
      .where(inArray(dimensions.categoryId, ids))
      .groupBy(dimensions.categoryId),
  ]);

  const modelMap = new Map(modelStats.map((r) => [r.categoryId, r.value]));
  const dimMap = new Map(dimStats.map((r) => [r.categoryId, r.value]));

  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    order: c.order,
    modelCount: Number(modelMap.get(c.id) ?? 0),
    dimensionCount: Number(dimMap.get(c.id) ?? 0),
  }));
}

export async function getCategoryByIdForAdmin(
  id: number,
): Promise<typeof categories.$inferSelect | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  return row ?? null;
}

export async function createCategoryAdmin(
  input: CategoryInput,
): Promise<typeof categories.$inferSelect> {
  validate(input);
  const [dup] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, input.slug));
  if (dup) throw new Error("已存在相同 slug 的分类");

  const [row] = await db
    .insert(categories)
    .values({
      slug: input.slug.trim(),
      name: input.name.trim(),
      order: input.order,
    })
    .returning();
  return row;
}

export async function updateCategoryAdmin(
  id: number,
  input: CategoryInput,
): Promise<typeof categories.$inferSelect | null> {
  validate(input);
  const [dup] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, input.slug));
  if (dup && dup.id !== id) throw new Error("已存在相同 slug 的分类");

  const [row] = await db
    .update(categories)
    .set({
      slug: input.slug.trim(),
      name: input.name.trim(),
      order: input.order,
    })
    .where(eq(categories.id, id))
    .returning();
  return row ?? null;
}

/**
 * 删除分类
 * 注意：外键 cascade 会带走该分类下所有维度，进而带走所有相关投票/统计。
 * 调用方需在 UI 上充分提示。
 */
export async function deleteCategoryAdmin(id: number): Promise<boolean> {
  const rows = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return rows.length > 0;
}
