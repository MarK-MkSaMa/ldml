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
import { normalizeSafeExternalUrl } from "./safe-url";

export type AdminModelRow = typeof models.$inferSelect;

export type ModelFilter = {
  categoryId?: number;
  status?: ModelStatus;
};

export type ModelInput = {
  name: string;
  slug: string;
  categoryId: number;
  vendor?: string | null;
  licenseText?: string | null;
  homepageUrl?: string | null;
  releasedAt?: string | null; // 'YYYY-MM-DD'
  status: ModelStatus;
  pinned?: boolean;
};

const NAME_MAX = 100;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_MAX = 80;
const VENDOR_MAX = 60;

function clean(input: ModelInput) {
  return {
    ...input,
    name: input.name.trim(),
    slug: input.slug.trim(),
    vendor: input.vendor?.trim() || null,
    licenseText: input.licenseText?.trim() || null,
    homepageUrl: normalizeSafeExternalUrl(input.homepageUrl, { fieldName: "官网地址" }),
    releasedAt: input.releasedAt || null,
    pinned: input.pinned ?? false,
  };
}

function validate(input: ModelInput): ReturnType<typeof clean> {
  const data = clean(input);
  if (!data.name) throw new Error("名称不能为空");
  if (data.name.length > NAME_MAX)
    throw new Error(`名称超过 ${NAME_MAX} 字符`);
  if (!data.slug) throw new Error("slug 不能为空");
  if (data.slug.length > SLUG_MAX)
    throw new Error(`slug 超过 ${SLUG_MAX} 字符`);
  if (!SLUG_RE.test(data.slug))
    throw new Error("slug 只能包含小写字母、数字和连字符，且以字母或数字开头");
  if (data.vendor && data.vendor.length > VENDOR_MAX)
    throw new Error(`厂商超过 ${VENDOR_MAX} 字符`);
  if (!modelStatusEnum.includes(data.status))
    throw new Error("非法的状态值");
  return data;
}

export async function listModelsForAdmin(filter: ModelFilter = {}): Promise<AdminModelRow[]> {
  const conditions = [
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
  const data = validate(input);
  const [row] = await db
    .insert(models)
    .values({
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      vendor: data.vendor,
      licenseText: data.licenseText,
      homepageUrl: data.homepageUrl,
      releasedAt: data.releasedAt,
      status: data.status,
      pinned: data.pinned,
      // 进入 observing/listed 时记录发布时间
      publishedAt:
        data.status === "observing" || data.status === "listed" ? new Date() : null,
    })
    .returning();
  return row;
}

export async function updateModelAdmin(
  id: string,
  input: ModelInput,
): Promise<AdminModelRow | null> {
  const data = validate(input);

  const [existing] = await db
    .select({ status: models.status, publishedAt: models.publishedAt })
    .from(models)
    .where(eq(models.id, id));
  if (!existing) return null;

  // 草稿 → observing/listed 时填充 publishedAt（如果没有）
  const promoting =
    (existing.status === "draft" || existing.status === "archived") &&
    (data.status === "observing" || data.status === "listed");

  const [row] = await db
    .update(models)
    .set({
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      vendor: data.vendor,
      licenseText: data.licenseText,
      homepageUrl: data.homepageUrl,
      releasedAt: data.releasedAt,
      status: data.status,
      pinned: data.pinned,
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
