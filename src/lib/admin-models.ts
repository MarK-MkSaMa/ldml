/**
 * 模型管理服务层（后台用）
 *
 * 与前台 src/lib/models.ts 区分：
 *   - 前台只读 listed/observing 模型
 *   - 后台能看到所有状态，并能修改
 */
import { db } from "@/db";
import { models, modelStatusEnum, type ModelStatus } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export type AdminModelRow = typeof models.$inferSelect;

export type ModelFilter = {
  licenseId?: number;
  categoryId?: number;
  status?: ModelStatus;
};

export type ModelInput = {
  name: string;
  slug: string;
  licenseId: number;
  categoryId: number;
  vendor?: string | null;
  logoUrl?: string | null;
  homepageUrl?: string | null;
  description?: string | null;
  contextLength?: number | null;
  params?: string | null;
  releasedAt?: string | null; // 'YYYY-MM-DD'
  status: ModelStatus;
  pinned?: boolean;
};

const NAME_MAX = 100;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_MAX = 80;
const VENDOR_MAX = 60;
const DESC_MAX = 2000;

function validate(input: ModelInput): void {
  if (!input.name?.trim()) throw new Error("名称不能为空");
  if (input.name.length > NAME_MAX)
    throw new Error(`名称超过 ${NAME_MAX} 字符`);
  if (!input.slug?.trim()) throw new Error("slug 不能为空");
  if (input.slug.length > SLUG_MAX)
    throw new Error(`slug 超过 ${SLUG_MAX} 字符`);
  if (!SLUG_RE.test(input.slug))
    throw new Error("slug 只能包含小写字母、数字和连字符，且以字母或数字开头");
  if (input.vendor && input.vendor.length > VENDOR_MAX)
    throw new Error(`厂商超过 ${VENDOR_MAX} 字符`);
  if (input.description && input.description.length > DESC_MAX)
    throw new Error(`描述超过 ${DESC_MAX} 字符`);
  if (!modelStatusEnum.includes(input.status))
    throw new Error("非法的状态值");
}

export async function listModelsForAdmin(filter: ModelFilter = {}): Promise<AdminModelRow[]> {
  const conditions = [
    filter.licenseId !== undefined ? eq(models.licenseId, filter.licenseId) : undefined,
    filter.categoryId !== undefined ? eq(models.categoryId, filter.categoryId) : undefined,
    filter.status !== undefined ? eq(models.status, filter.status) : undefined,
  ].filter(Boolean) as (ReturnType<typeof eq>)[];

  const baseQuery = db.select().from(models);
  const filtered =
    conditions.length === 0 ? baseQuery : baseQuery.where(and(...conditions));
  return filtered.orderBy(desc(models.pinned), asc(models.name));
}

export async function getModelByIdForAdmin(id: string): Promise<AdminModelRow | null> {
  const [row] = await db.select().from(models).where(eq(models.id, id));
  return row ?? null;
}

export async function createModelAdmin(input: ModelInput): Promise<AdminModelRow> {
  validate(input);
  const [row] = await db
    .insert(models)
    .values({
      name: input.name.trim(),
      slug: input.slug.trim(),
      licenseId: input.licenseId,
      categoryId: input.categoryId,
      vendor: input.vendor?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      homepageUrl: input.homepageUrl?.trim() || null,
      description: input.description?.trim() || null,
      contextLength: input.contextLength ?? null,
      params: input.params?.trim() || null,
      releasedAt: input.releasedAt || null,
      status: input.status,
      pinned: input.pinned ?? false,
      // 进入 observing/listed 时记录发布时间
      publishedAt:
        input.status === "observing" || input.status === "listed" ? new Date() : null,
    })
    .returning();
  return row;
}

export async function updateModelAdmin(
  id: string,
  input: ModelInput,
): Promise<AdminModelRow | null> {
  validate(input);

  const [existing] = await db
    .select({ status: models.status, publishedAt: models.publishedAt })
    .from(models)
    .where(eq(models.id, id));
  if (!existing) return null;

  // 草稿 → observing/listed 时填充 publishedAt（如果没有）
  const promoting =
    (existing.status === "draft" || existing.status === "archived") &&
    (input.status === "observing" || input.status === "listed");

  const [row] = await db
    .update(models)
    .set({
      name: input.name.trim(),
      slug: input.slug.trim(),
      licenseId: input.licenseId,
      categoryId: input.categoryId,
      vendor: input.vendor?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      homepageUrl: input.homepageUrl?.trim() || null,
      description: input.description?.trim() || null,
      contextLength: input.contextLength ?? null,
      params: input.params?.trim() || null,
      releasedAt: input.releasedAt || null,
      status: input.status,
      pinned: input.pinned ?? false,
      ...(promoting && existing.publishedAt === null
        ? { publishedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(models.id, id))
    .returning();
  return row ?? null;
}

export async function setModelStatusAdmin(
  id: string,
  status: ModelStatus,
): Promise<AdminModelRow | null> {
  const [existing] = await db
    .select({ status: models.status, publishedAt: models.publishedAt })
    .from(models)
    .where(eq(models.id, id));
  if (!existing) return null;

  const promoting =
    (existing.status === "draft" || existing.status === "archived") &&
    (status === "observing" || status === "listed");

  const [row] = await db
    .update(models)
    .set({
      status,
      ...(promoting && existing.publishedAt === null
        ? { publishedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(models.id, id))
    .returning();
  return row ?? null;
}

export async function setModelPinnedAdmin(
  id: string,
  pinned: boolean,
): Promise<AdminModelRow | null> {
  const [row] = await db
    .update(models)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(models.id, id))
    .returning();
  return row ?? null;
}

export async function deleteModelAdmin(id: string): Promise<boolean> {
  const rows = await db
    .delete(models)
    .where(eq(models.id, id))
    .returning({ id: models.id });
  return rows.length > 0;
}
