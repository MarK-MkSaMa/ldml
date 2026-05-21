/**
 * 评分异常检测
 *
 * 提供 4 种可疑模式的查询。仅返回数据，**不做任何自动处理**。
 * 由管理员人工判断后操作（封禁 / 撤销投票等）。
 */
import { db } from "@/db";
import {
  voteHistory,
  votes,
  users,
  models,
} from "@/db/schema";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

// 时间窗口和阈值（这些可以以后配置化）
const RECENT_WINDOW_HOURS = 24;
const HOT_WINDOW_HOURS = 1;
const NEW_USER_DAYS = 7;

const IP_THRESHOLD = 10;      // 24h 同 IP ≥ N 次操作
const MODEL_BURST_THRESHOLD = 5;  // 1h 内某模型获得 ≥ N 张全 10/全 1 分
const NEW_USER_VOTE_THRESHOLD = 10; // 新账号 7 天内 ≥ N 票
const USER_BURST_THRESHOLD = 10;  // 1h 内某用户 ≥ N 票

// ============================================================
// 1. 同 IP 集中操作
// ============================================================

export type IpClusterRow = {
  ipHash: string;
  count: number;
  users: { id: string; username: string }[];
  lastSeen: Date;
};

export async function detectIpClusters(): Promise<IpClusterRow[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_HOURS * 3600 * 1000);

  // 按 ip_hash GROUP BY，过滤 NULL
  const rows = await db
    .select({
      ipHash: voteHistory.ipHash,
      value: count(),
      lastSeen: sql<Date>`max(${voteHistory.createdAt})`,
    })
    .from(voteHistory)
    .where(
      and(
        gte(voteHistory.createdAt, since),
        sql`${voteHistory.ipHash} is not null`,
      ),
    )
    .groupBy(voteHistory.ipHash)
    .having(sql`count(*) >= ${IP_THRESHOLD}`)
    .orderBy(desc(count()));

  if (rows.length === 0) return [];

  const ipHashes = rows.map((r) => r.ipHash).filter((x): x is string => !!x);

  // 取每个 ipHash 对应的用户列表
  const userRows = await db
    .selectDistinct({
      ipHash: voteHistory.ipHash,
      userId: voteHistory.userId,
    })
    .from(voteHistory)
    .where(
      and(
        gte(voteHistory.createdAt, since),
        inArray(voteHistory.ipHash, ipHashes),
      ),
    );

  const userIds = [...new Set(userRows.map((r) => r.userId))];
  const userInfos = userIds.length === 0
    ? []
    : await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.id, userIds));
  const userMap = new Map(userInfos.map((u) => [u.id, u]));

  const usersByIp = new Map<string, { id: string; username: string }[]>();
  for (const r of userRows) {
    if (!r.ipHash) continue;
    const u = userMap.get(r.userId);
    if (!u) continue;
    const arr = usersByIp.get(r.ipHash) ?? [];
    arr.push(u);
    usersByIp.set(r.ipHash, arr);
  }

  return rows
    .filter((r) => r.ipHash)
    .map((r) => ({
      ipHash: r.ipHash!,
      count: Number(r.value),
      users: usersByIp.get(r.ipHash!) ?? [],
      lastSeen: new Date(r.lastSeen),
    }));
}

// ============================================================
// 2. 短时间内某模型获得大量极端评分
// ============================================================

export type ModelBurstRow = {
  modelId: string;
  modelSlug: string;
  modelName: string;
  score: number;
  count: number;
  uniqueUsers: number;
};

export async function detectModelBursts(): Promise<ModelBurstRow[]> {
  const since = new Date(Date.now() - HOT_WINDOW_HOURS * 3600 * 1000);

  // 过去 1h 内，按 (model_id, score) 分组，score IN (1, 10)
  const rows = await db
    .select({
      modelId: votes.modelId,
      score: votes.score,
      value: count(),
      uniqueUsers: sql<number>`count(distinct ${votes.userId})::int`,
    })
    .from(votes)
    .where(
      and(
        gte(votes.updatedAt, since),
        inArray(votes.score, [1, 10]),
      ),
    )
    .groupBy(votes.modelId, votes.score)
    .having(sql`count(*) >= ${MODEL_BURST_THRESHOLD}`)
    .orderBy(desc(count()));

  if (rows.length === 0) return [];

  const modelIds = [...new Set(rows.map((r) => r.modelId))];
  const modelInfos = await db
    .select({ id: models.id, slug: models.slug, name: models.name })
    .from(models)
    .where(inArray(models.id, modelIds));
  const modelMap = new Map(modelInfos.map((m) => [m.id, m]));

  return rows.map((r) => {
    const m = modelMap.get(r.modelId);
    return {
      modelId: r.modelId,
      modelSlug: m?.slug ?? "",
      modelName: m?.name ?? "(unknown)",
      score: r.score,
      count: Number(r.value),
      uniqueUsers: Number(r.uniqueUsers),
    };
  });
}

// ============================================================
// 3. 新账号高频投票
// ============================================================

export type NewUserBurstRow = {
  userId: string;
  username: string;
  linuxdoId: number;
  trustLevel: number;
  createdAt: Date;
  voteCount: number;
};

export async function detectNewUserBursts(): Promise<NewUserBurstRow[]> {
  const since = new Date(Date.now() - NEW_USER_DAYS * 24 * 3600 * 1000);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      linuxdoId: users.linuxdoId,
      trustLevel: users.trustLevel,
      createdAt: users.createdAt,
      voteCount: sql<number>`(select count(*)::int from ${votes} where ${votes.userId} = ${users.id})`,
    })
    .from(users)
    .where(gte(users.createdAt, since));

  return rows
    .map((r) => ({
      userId: r.id,
      username: r.username,
      linuxdoId: r.linuxdoId,
      trustLevel: r.trustLevel,
      createdAt: r.createdAt,
      voteCount: Number(r.voteCount),
    }))
    .filter((r) => r.voteCount >= NEW_USER_VOTE_THRESHOLD)
    .sort((a, b) => b.voteCount - a.voteCount);
}

// ============================================================
// 4. 单用户短时间内大量投票
// ============================================================

export type UserBurstRow = {
  userId: string;
  username: string;
  linuxdoId: number;
  count: number;
  lastAt: Date;
};

export async function detectUserBursts(): Promise<UserBurstRow[]> {
  const since = new Date(Date.now() - HOT_WINDOW_HOURS * 3600 * 1000);

  const rows = await db
    .select({
      userId: voteHistory.userId,
      value: count(),
      lastAt: sql<Date>`max(${voteHistory.createdAt})`,
    })
    .from(voteHistory)
    .where(gte(voteHistory.createdAt, since))
    .groupBy(voteHistory.userId)
    .having(sql`count(*) >= ${USER_BURST_THRESHOLD}`)
    .orderBy(desc(count()));

  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.userId);
  const userInfos = await db
    .select({
      id: users.id,
      username: users.username,
      linuxdoId: users.linuxdoId,
    })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(userInfos.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = userMap.get(r.userId);
    return {
      userId: r.userId,
      username: u?.username ?? "(unknown)",
      linuxdoId: u?.linuxdoId ?? 0,
      count: Number(r.value),
      lastAt: new Date(r.lastAt),
    };
  });
}

// ============================================================
// 阈值常量（前端展示用）
// ============================================================

export const ABUSE_THRESHOLDS = {
  RECENT_WINDOW_HOURS,
  HOT_WINDOW_HOURS,
  NEW_USER_DAYS,
  IP_THRESHOLD,
  MODEL_BURST_THRESHOLD,
  NEW_USER_VOTE_THRESHOLD,
  USER_BURST_THRESHOLD,
} as const;

// 抑制 unused
void eq;
