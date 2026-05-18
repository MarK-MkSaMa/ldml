/**
 * 评分服务
 *
 * 提供 castVote / withdrawVote 两个原子操作：
 *   1. 写入 / 删除 votes 记录
 *   2. 追加 vote_history（审计）
 *   3. 增量重算 model_stats 中该 (model, dimension) 的统计
 *
 * 排序用贝叶斯均分（方案 §4.3）：
 *   weighted = (C * m + n * avg) / (C + n)
 *
 * 其中：
 *   - m = 该 (category, dimension) 全站均值
 *   - C = 平滑系数（30）
 *   - n / avg = 该 (model, dimension) 的投票数 / 算术均分
 *
 * 注意：本文件里的所有数据库操作目前都用普通查询（非事务）。
 * Neon 的 HTTP 驱动场景下事务支持有限；本步骤先保证逻辑正确，
 * 一致性问题后续可加 advisory lock / 队列再优化。
 */
import { db } from "@/db";
import { votes, voteHistory, modelStats, dimensions, models } from "@/db/schema";
import { and, eq, sql, avg, count } from "drizzle-orm";
import { createHash } from "node:crypto";

const BAYES_C = 30;

export class VoteError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_SCORE"
      | "DIMENSION_MISMATCH"
      | "MODEL_NOT_FOUND"
      | "DIMENSION_NOT_FOUND",
  ) {
    super(message);
  }
}

/**
 * 投票上下文（来自请求）
 */
export type VoteContext = {
  userId: string; // users.id
  ip?: string | null;
  userAgent?: string | null;
};

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * 投/改一个评分
 */
export async function castVote(
  ctx: VoteContext,
  modelId: string,
  dimensionId: number,
  score: number,
): Promise<void> {
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new VoteError("分数必须是 1-10 的整数", "INVALID_SCORE");
  }

  // 校验 model + dimension 存在，且 dimension 属于 model 的 category
  const [m] = await db
    .select({ categoryId: models.categoryId })
    .from(models)
    .where(eq(models.id, modelId));
  if (!m) throw new VoteError("模型不存在", "MODEL_NOT_FOUND");

  const [d] = await db
    .select({ categoryId: dimensions.categoryId })
    .from(dimensions)
    .where(eq(dimensions.id, dimensionId));
  if (!d) throw new VoteError("维度不存在", "DIMENSION_NOT_FOUND");
  if (d.categoryId !== m.categoryId) {
    throw new VoteError("维度不属于该模型所在分类", "DIMENSION_MISMATCH");
  }

  // upsert votes
  const [existing] = await db
    .select({ id: votes.id, score: votes.score })
    .from(votes)
    .where(
      and(
        eq(votes.userId, ctx.userId),
        eq(votes.modelId, modelId),
        eq(votes.dimensionId, dimensionId),
      ),
    );

  const action: "create" | "update" = existing ? "update" : "create";

  if (existing) {
    if (existing.score !== score) {
      await db
        .update(votes)
        .set({ score, updatedAt: new Date() })
        .where(eq(votes.id, existing.id));
    }
  } else {
    await db.insert(votes).values({
      userId: ctx.userId,
      modelId,
      dimensionId,
      score,
    });
  }

  // 审计历史
  await db.insert(voteHistory).values({
    userId: ctx.userId,
    modelId,
    dimensionId,
    score,
    action,
    ipHash: hashIp(ctx.ip),
    userAgent: ctx.userAgent ?? null,
  });

  // 重算该 (model, dim) 的 stats
  await recomputeModelStat(modelId, dimensionId);
}

/**
 * 撤回某个维度的评分
 */
export async function withdrawVote(
  ctx: VoteContext,
  modelId: string,
  dimensionId: number,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: votes.id, score: votes.score })
    .from(votes)
    .where(
      and(
        eq(votes.userId, ctx.userId),
        eq(votes.modelId, modelId),
        eq(votes.dimensionId, dimensionId),
      ),
    );
  if (!existing) return false;

  await db.delete(votes).where(eq(votes.id, existing.id));

  await db.insert(voteHistory).values({
    userId: ctx.userId,
    modelId,
    dimensionId,
    score: existing.score,
    action: "withdraw",
    ipHash: hashIp(ctx.ip),
    userAgent: ctx.userAgent ?? null,
  });

  await recomputeModelStat(modelId, dimensionId);
  return true;
}

/**
 * 重算某 (model, dimension) 的 model_stats
 *
 * 全站均值 m 是 (dimension) 维度的均值；我们用所有 model 在该 dimension 的平均
 * 作为 m。这样新维度刚开始时 m 也会动态变化。
 */
async function recomputeModelStat(modelId: string, dimensionId: number): Promise<void> {
  // 1. 本 (model, dim) 的统计
  const [agg] = await db
    .select({
      n: count(votes.id),
      avg: avg(votes.score),
    })
    .from(votes)
    .where(and(eq(votes.modelId, modelId), eq(votes.dimensionId, dimensionId)));

  const n = Number(agg?.n ?? 0);
  const avgScore = agg?.avg !== null && agg?.avg !== undefined ? Number(agg.avg) : null;

  // 2. 该 dimension 上全站均值 m
  const [globalAgg] = await db
    .select({ globalAvg: avg(votes.score) })
    .from(votes)
    .where(eq(votes.dimensionId, dimensionId));
  const m =
    globalAgg?.globalAvg !== null && globalAgg?.globalAvg !== undefined
      ? Number(globalAgg.globalAvg)
      : null;

  // 3. 贝叶斯加权分
  // 若全站还没有任何投票（m=null），退化为 avgScore
  let weighted: number | null = null;
  if (n > 0 && avgScore !== null) {
    if (m === null) {
      weighted = avgScore;
    } else {
      weighted = (BAYES_C * m + n * avgScore) / (BAYES_C + n);
    }
  }

  // 4. upsert model_stats
  await db
    .insert(modelStats)
    .values({
      modelId,
      dimensionId,
      voteCount: n,
      avgScore: avgScore === null ? null : avgScore.toFixed(2),
      weightedScore: weighted === null ? null : weighted.toFixed(2),
    })
    .onConflictDoUpdate({
      target: [modelStats.modelId, modelStats.dimensionId],
      set: {
        voteCount: n,
        avgScore: avgScore === null ? null : avgScore.toFixed(2),
        weightedScore: weighted === null ? null : weighted.toFixed(2),
        updatedAt: new Date(),
      },
    });

  // 抑制 unused 警告
  void sql;
}

/**
 * 查询某用户对某模型的所有评分
 * 返回 { dimensionId: score } 的映射
 */
export async function getUserVotesForModel(
  userId: string,
  modelId: string,
): Promise<Record<number, number>> {
  const rows = await db
    .select({ dimensionId: votes.dimensionId, score: votes.score })
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.modelId, modelId)));
  const out: Record<number, number> = {};
  for (const r of rows) out[r.dimensionId] = r.score;
  return out;
}
