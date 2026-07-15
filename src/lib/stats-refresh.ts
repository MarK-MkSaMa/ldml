/**
 * model_stats 后台刷新
 *
 * 因为评分有时间衰减，旧的 model_stats 即使没人投票也会"过期"。
 * 这里提供 lazy 检测 + 批量重算：榜单页访问时通过 unstable_after
 * 在响应返回后异步执行（如必要）。
 */
import { db } from "@/db";
import { dimensions, modelStats, votes, models } from "@/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { voteWeight } from "./vote-weight";

const BAYES_C = 30;
const STALE_HOURS = 6; // 超过 6 小时未刷新视为 stale

/**
 * 判断某分类是否有 stale 的 model_stats
 * 用最旧的一行 updatedAt 判定
 */
export async function hasStaleStats(): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_HOURS * 3600 * 1000);
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(modelStats)
    .where(lt(modelStats.updatedAt, cutoff));
  return (row?.value ?? 0) > 0;
}

/**
 * 重算所有 model_stats（时间衰减 + 贝叶斯）
 *
 * 实现策略：
 *   1. 一次性把所有 votes 拉到内存（按 (modelId, dimensionId) 分组）
 *   2. 算每个 (model, dim) 的加权均分 + 全站每个 dim 的均值
 *   3. 用单条 INSERT ... ON CONFLICT 批量 upsert
 *
 * 对小数据量站点（< 10 万票）一次跑 < 1 秒。
 * 数据量上去后可改成按分类分批。
 */
export async function recomputeAllStats(): Promise<{
  rows: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  const now = new Date();

  // 拉所有票
  const allVotes = await db
    .select({
      modelId: votes.modelId,
      dimensionId: votes.dimensionId,
      score: votes.score,
      updatedAt: votes.updatedAt,
    })
    .from(votes)
    .innerJoin(models, eq(models.id, votes.modelId))
    .innerJoin(dimensions, eq(dimensions.id, votes.dimensionId))
    .where(eq(models.categoryId, dimensions.categoryId));

  // 按 dim 算全站加权均值 m
  const globalByDim = new Map<number, { weightedSum: number; effectiveN: number }>();
  // 按 (model, dim) 累加
  type Cell = { weightedSum: number; effectiveN: number; rawCount: number };
  const byCell = new Map<string, Cell>();

  for (const v of allVotes) {
    const w = voteWeight(v.updatedAt, now);
    const key = `${v.modelId}::${v.dimensionId}`;
    const cell = byCell.get(key) ?? { weightedSum: 0, effectiveN: 0, rawCount: 0 };
    cell.weightedSum += v.score * w;
    cell.effectiveN += w;
    cell.rawCount++;
    byCell.set(key, cell);

    const g = globalByDim.get(v.dimensionId) ?? { weightedSum: 0, effectiveN: 0 };
    g.weightedSum += v.score * w;
    g.effectiveN += w;
    globalByDim.set(v.dimensionId, g);
  }

  // 拉所有已有 model_stats，标识"已存在的 (model, dim) 行"
  const existing = await db
    .select({
      modelId: modelStats.modelId,
      dimensionId: modelStats.dimensionId,
    })
    .from(modelStats);
  const existingSet = new Set(existing.map((r) => `${r.modelId}::${r.dimensionId}`));

  // 收集要 upsert 的行 + 要删的行（票数变 0 的）
  const toUpsert: {
    modelId: string;
    dimensionId: number;
    voteCount: number;
    avgScore: string | null;
    weightedScore: string | null;
  }[] = [];

  for (const [key, cell] of byCell) {
    const [modelId, dimStr] = key.split("::");
    const dimensionId = Number(dimStr);
    const avg = cell.effectiveN > 0 ? cell.weightedSum / cell.effectiveN : null;
    const g = globalByDim.get(dimensionId);
    const m = g && g.effectiveN > 0 ? g.weightedSum / g.effectiveN : null;
    let weighted: number | null = null;
    if (cell.effectiveN > 0 && avg !== null) {
      weighted = m === null ? avg : (BAYES_C * m + cell.effectiveN * avg) / (BAYES_C + cell.effectiveN);
    }
    toUpsert.push({
      modelId,
      dimensionId,
      voteCount: cell.rawCount,
      avgScore: avg === null ? null : avg.toFixed(2),
      weightedScore: weighted === null ? null : weighted.toFixed(2),
    });
  }

  // upsert
  // PG drizzle 不支持一次性多行 onConflict 直接更新 EXCLUDED；
  // 用 for 循环，数据量小 OK
  let rows = 0;
  for (const r of toUpsert) {
    await db
      .insert(modelStats)
      .values(r)
      .onConflictDoUpdate({
        target: [modelStats.modelId, modelStats.dimensionId],
        set: {
          voteCount: r.voteCount,
          avgScore: r.avgScore,
          weightedScore: r.weightedScore,
          updatedAt: now,
        },
      });
    rows++;
  }

  // 处理"原本有 stats 但本轮没票了"：保持原值但 updatedAt 标记 now
  // 防止 stale 检测重复触发
  const upsertedKeys = new Set(toUpsert.map((r) => `${r.modelId}::${r.dimensionId}`));
  const orphans = [...existingSet].filter((k) => !upsertedKeys.has(k));
  for (const key of orphans) {
    const [modelId, dimStr] = key.split("::");
    await db
      .update(modelStats)
      .set({
        voteCount: 0,
        avgScore: null,
        weightedScore: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(modelStats.modelId, modelId),
          eq(modelStats.dimensionId, Number(dimStr)),
        ),
      );
    rows++;
  }

  return { rows, durationMs: Date.now() - t0 };
}

/**
 * lazy 触发：检测 stale 才真重算
 * 在 unstable_after 里调用，不阻塞响应
 */
export async function recomputeStatsIfStale(): Promise<boolean> {
  if (await hasStaleStats()) {
    await recomputeAllStats();
    return true;
  }
  return false;
}
