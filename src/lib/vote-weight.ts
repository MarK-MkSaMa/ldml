/**
 * 评分时间衰减权重
 *
 * 旧评分的权重逐渐降低，新模型出现时让位给最近的相对判断。
 *
 * 公式：weight = max(0.5 ^ (age_days / halfLife), floor)
 *
 * - halfLife = 90 天（3 个月）
 * - floor    = 0.20（永不归零，老票仍有 20% 历史价值）
 *
 * 票龄          权重
 *   当天        1.00
 *   1 个月      0.79
 *   2 个月      0.63
 *   3 个月      0.50（半衰期）
 *   6 个月      0.25
 *   9 个月      0.20（已触底）
 *
 * 此文件**纯计算**，无副作用，前后端共用。
 */

export const HALF_LIFE_DAYS = 90;
export const WEIGHT_FLOOR = 0.2;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 单票权重：基于投票时间到 now 的天数
 */
export function voteWeight(votedAt: Date, now: Date = new Date()): number {
  const ageDays = (now.getTime() - votedAt.getTime()) / DAY_MS;
  const raw = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
  return Math.max(raw, WEIGHT_FLOOR);
}

/**
 * 给用户看的"评分新鲜度"百分比（0-100 整数）
 */
export function votePercent(votedAt: Date, now: Date = new Date()): number {
  return Math.round(voteWeight(votedAt, now) * 100);
}

/**
 * 该不该提示用户"重投"：权重已降到 60% 以下
 */
export function shouldRevote(votedAt: Date, now: Date = new Date()): boolean {
  return voteWeight(votedAt, now) < 0.6;
}
