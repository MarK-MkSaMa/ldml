/**
 * 模型申请工单服务层
 */
import { db } from "@/db";
import {
  categories,
  modelRequests,
  models,
  users,
  type ModelRequestStatus,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { normalizeSafeExternalUrl } from "./safe-url";

export type ModelRequestInput = {
  requesterId: string;
  name: string;
  slug: string;
  categoryId: number;
  vendor?: string | null;
  licenseText?: string | null;
  homepageUrl?: string | null;
  releasedAt?: string | null;
};

export type AdminModelRequestRow = Awaited<ReturnType<typeof listModelRequestsForAdmin>>[number];

const NAME_MAX = 100;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_MAX = 80;
const VENDOR_MAX = 60;
const LICENSE_MAX = 80;

function clean(input: ModelRequestInput) {
  return {
    requesterId: input.requesterId,
    name: input.name.trim(),
    slug: input.slug.trim(),
    categoryId: input.categoryId,
    vendor: input.vendor?.trim() || null,
    licenseText: input.licenseText?.trim() || null,
    homepageUrl: input.homepageUrl?.trim() || null,
    releasedAt: input.releasedAt?.trim() || null,
  };
}

function validate(input: ModelRequestInput): ReturnType<typeof clean> {
  const data = clean(input);
  if (!data.name) throw new Error("名称不能为空");
  if (data.name.length > NAME_MAX) throw new Error(`名称超过 ${NAME_MAX} 字符`);
  if (!data.slug) throw new Error("slug 不能为空");
  if (data.slug.length > SLUG_MAX) throw new Error(`slug 超过 ${SLUG_MAX} 字符`);
  if (!SLUG_RE.test(data.slug)) {
    throw new Error("slug 只能包含小写字母、数字和连字符，且以字母或数字开头");
  }
  if (!Number.isInteger(data.categoryId) || data.categoryId <= 0) {
    throw new Error("请选择分类");
  }
  if (data.vendor && data.vendor.length > VENDOR_MAX) {
    throw new Error(`厂商超过 ${VENDOR_MAX} 字符`);
  }
  if (data.licenseText && data.licenseText.length > LICENSE_MAX) {
    throw new Error(`开源协议超过 ${LICENSE_MAX} 字符`);
  }
  data.homepageUrl = normalizeSafeExternalUrl(data.homepageUrl, { fieldName: "官网地址" });
  if (data.releasedAt && !/^\d{4}-\d{2}-\d{2}$/.test(data.releasedAt)) {
    throw new Error("发布日期格式不正确");
  }
  return data;
}

async function ensureCanUseSlug(slug: string) {
  const [existingModel] = await db
    .select({ id: models.id })
    .from(models)
    .where(eq(models.slug, slug));
  if (existingModel) throw new Error("已存在相同 slug 的模型");

  const [pendingRequest] = await db
    .select({ id: modelRequests.id })
    .from(modelRequests)
    .where(and(eq(modelRequests.slug, slug), eq(modelRequests.status, "pending")));
  if (pendingRequest) throw new Error("已有相同 slug 的待审核申请");
}

export async function createModelRequest(input: ModelRequestInput) {
  const data = validate(input);

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, data.categoryId));
  if (!category) throw new Error("分类不存在");

  await ensureCanUseSlug(data.slug);

  const [row] = await db
    .insert(modelRequests)
    .values({
      requesterId: data.requesterId,
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug,
      vendor: data.vendor,
      licenseText: data.licenseText,
      homepageUrl: data.homepageUrl,
      releasedAt: data.releasedAt,
    })
    .returning();
  return row;
}

export async function listModelRequestsForAdmin(filter: { status?: ModelRequestStatus } = {}) {
  const conditions = [
    filter.status !== undefined ? eq(modelRequests.status, filter.status) : undefined,
  ].filter(Boolean) as (ReturnType<typeof eq>)[];

  const baseQuery = db
    .select({
      id: modelRequests.id,
      requesterId: modelRequests.requesterId,
      requesterName: users.username,
      categoryId: modelRequests.categoryId,
      categoryName: categories.name,
      name: modelRequests.name,
      slug: modelRequests.slug,
      vendor: modelRequests.vendor,
      licenseText: modelRequests.licenseText,
      homepageUrl: modelRequests.homepageUrl,
      releasedAt: modelRequests.releasedAt,
      status: modelRequests.status,
      reviewedBy: modelRequests.reviewedBy,
      reviewedAt: modelRequests.reviewedAt,
      rejectReason: modelRequests.rejectReason,
      createdModelId: modelRequests.createdModelId,
      createdAt: modelRequests.createdAt,
      updatedAt: modelRequests.updatedAt,
    })
    .from(modelRequests)
    .innerJoin(users, eq(modelRequests.requesterId, users.id))
    .innerJoin(categories, eq(modelRequests.categoryId, categories.id));

  const filtered = conditions.length === 0 ? baseQuery : baseQuery.where(and(...conditions));
  return filtered.orderBy(desc(modelRequests.createdAt));
}

export async function approveModelRequest(id: string, reviewerId: string) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(modelRequests)
      .where(eq(modelRequests.id, id));
    if (!request) throw new Error("申请不存在");
    if (request.status !== "pending") throw new Error("该申请已处理");

    const [existingModel] = await tx
      .select({ id: models.id })
      .from(models)
      .where(eq(models.slug, request.slug));
    if (existingModel) throw new Error("已存在相同 slug 的模型，无法通过");

    const [created] = await tx
      .insert(models)
      .values({
        categoryId: request.categoryId,
        name: request.name,
        slug: request.slug,
        vendor: request.vendor,
        licenseText: request.licenseText,
        homepageUrl: request.homepageUrl,
        releasedAt: request.releasedAt,
        status: "observing",
        pinned: false,
        publishedAt: new Date(),
      })
      .returning({ id: models.id });

    const [updated] = await tx
      .update(modelRequests)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectReason: null,
        createdModelId: created.id,
        updatedAt: new Date(),
      })
      .where(eq(modelRequests.id, id))
      .returning();

    return updated;
  });
}

export async function rejectModelRequest(
  id: string,
  reviewerId: string,
  rejectReason?: string | null,
) {
  const [request] = await db
    .select({ id: modelRequests.id, status: modelRequests.status })
    .from(modelRequests)
    .where(eq(modelRequests.id, id));
  if (!request) throw new Error("申请不存在");
  if (request.status !== "pending") throw new Error("该申请已处理");

  const [updated] = await db
    .update(modelRequests)
    .set({
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectReason: rejectReason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(modelRequests.id, id))
    .returning();
  return updated;
}
