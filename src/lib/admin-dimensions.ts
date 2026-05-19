/**
 * 维度管理服务层（后台用）
 */
import { db } from "@/db";
import { dimensions, categories } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type AdminDimension = typeof dimensions.$inferSelect;
export type AdminCategory = typeof categories.$inferSelect;

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_MAX = 40;
const NAME_MAX = 40;
const DESC_MAX = 200;

export type DimensionInput = {
  categoryId: number;
  slug: string;
  name: string;
  description?: string | null;
  order: number;
};

function validate(input: DimensionInput): void {
  if (!input.slug?.trim()) throw new Error("slug 不能为空");
  if (input.slug.length > SLUG_MAX)
    throw new Error(`slug 超过 ${SLUG_MAX} 字符`);
  if (!SLUG_RE.test(input.slug))
    throw new Error("slug 只能包含小写字母、数字和连字符");
  if (!input.name?.trim()) throw new Error("名称不能为空");
  if (input.name.length > NAME_MAX)
    throw new Error(`名称超过 ${NAME_MAX} 字符`);
  if (input.description && input.description.length > DESC_MAX)
    throw new Error(`描述超过 ${DESC_MAX} 字符`);
  if (!Number.isInteger(input.order)) throw new Error("排序号必须是整数");
}

/**
 * 列出所有维度，按 category + order 排序
 */
export async function listDimensionsForAdmin(): Promise<{
  category: AdminCategory;
  dims: AdminDimension[];
}[]> {
  const cats = await db.select().from(categories).orderBy(asc(categories.order));
  const dims = await db
    .select()
    .from(dimensions)
    .orderBy(asc(dimensions.categoryId), asc(dimensions.order));
  return cats.map((c) => ({
    category: c,
    dims: dims.filter((d) => d.categoryId === c.id),
  }));
}

export async function getDimensionByIdForAdmin(
  id: number,
): Promise<AdminDimension | null> {
  const [row] = await db.select().from(dimensions).where(eq(dimensions.id, id));
  return row ?? null;
}

export async function createDimensionAdmin(
  input: DimensionInput,
): Promise<AdminDimension> {
  validate(input);
  // 同 category 下 slug 必须唯一（数据库有唯一索引兜底，这里提前给可读错误）
  const [dup] = await db
    .select({ id: dimensions.id })
    .from(dimensions)
    .where(
      and(
        eq(dimensions.categoryId, input.categoryId),
        eq(dimensions.slug, input.slug),
      ),
    );
  if (dup) throw new Error("该分类下已存在相同 slug 的维度");

  const [row] = await db
    .insert(dimensions)
    .values({
      categoryId: input.categoryId,
      slug: input.slug.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      order: input.order,
    })
    .returning();
  return row;
}

export async function updateDimensionAdmin(
  id: number,
  input: DimensionInput,
): Promise<AdminDimension | null> {
  validate(input);

  const [dup] = await db
    .select({ id: dimensions.id })
    .from(dimensions)
    .where(
      and(
        eq(dimensions.categoryId, input.categoryId),
        eq(dimensions.slug, input.slug),
      ),
    );
  if (dup && dup.id !== id)
    throw new Error("该分类下已存在相同 slug 的维度");

  const [row] = await db
    .update(dimensions)
    .set({
      categoryId: input.categoryId,
      slug: input.slug.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      order: input.order,
    })
    .where(eq(dimensions.id, id))
    .returning();
  return row ?? null;
}

export async function deleteDimensionAdmin(id: number): Promise<boolean> {
  const rows = await db
    .delete(dimensions)
    .where(eq(dimensions.id, id))
    .returning({ id: dimensions.id });
  return rows.length > 0;
}

/**
 * 列出所有 categories（给表单 select 用）
 */
export async function listCategoriesForAdmin(): Promise<AdminCategory[]> {
  return db.select().from(categories).orderBy(asc(categories.order));
}
