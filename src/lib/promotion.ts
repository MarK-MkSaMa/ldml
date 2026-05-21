/**
 * 观察区自动晋升
 *
 * 规则：observing 模型满足以下任一条件即转为 listed：
 *   1. publishedAt 距今 >= OBSERVE_DAYS 天
 *   2. 任一维度的票数 >= OBSERVE_VOTES
 *
 * 触发时机：
 *   - 投票成功时被动检查该模型（高频但作用域小）
 *   - 管理员后台手动触发全量检查
 */
import { db } from "@/db";
import { models, modelStats } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

const OBSERVE_DAYS = 7;
const OBSERVE_VOTES = 50;

/**
 * 判断单个模型是否够格晋升；够格则更新数据库，返回是否变更
 */
export async function maybePromoteModel(modelId: string): Promise<boolean> {
  const [m] = await db
    .select({
      id: models.id,
      status: models.status,
      publishedAt: models.publishedAt,
    })
    .from(models)
    .where(eq(models.id, modelId));
  if (!m || m.status !== "observing") return false;

  // 条件 1：发布时间够久
  const daysSincePublish =
    m.publishedAt === null
      ? 0
      : (Date.now() - m.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  const eligibleByTime = daysSincePublish >= OBSERVE_DAYS;

  // 条件 2：任一维度票数够多
  let eligibleByVotes = false;
  if (!eligibleByTime) {
    const [row] = await db
      .select({ maxVotes: sql<number>`coalesce(max(${modelStats.voteCount}), 0)::int` })
      .from(modelStats)
      .where(eq(modelStats.modelId, modelId));
    eligibleByVotes = (row?.maxVotes ?? 0) >= OBSERVE_VOTES;
  }

  if (!eligibleByTime && !eligibleByVotes) return false;

  await db
    .update(models)
    .set({ status: "listed", updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.status, "observing")));
  return true;
}

/**
 * 批量检查：扫描所有 observing 模型，按规则晋升
 * 返回被晋升的模型数量
 */
export async function promoteEligibleModels(): Promise<{
  checked: number;
  promoted: number;
}> {
  const observing = await db
    .select({ id: models.id })
    .from(models)
    .where(eq(models.status, "observing"));

  let promoted = 0;
  for (const m of observing) {
    if (await maybePromoteModel(m.id)) promoted++;
  }

  return { checked: observing.length, promoted };
}
