import { db } from "@/db";
import {
  categories,
  subjectiveTestActivities,
  subjectiveTestEntries,
  subjectiveTestVoteItems,
  subjectiveTestVotes,
  users,
  type SubjectiveTestStatus,
} from "@/db/schema";
import { and, asc, countDistinct, desc, eq, inArray } from "drizzle-orm";
import { normalizeLinuxDoUrl } from "./safe-url";

export type SubjectiveTestActivityInput = {
  title: string;
  categoryId: number;
  requirement: string;
  resultNote?: string | null;
  linuxdoUrl?: string | null;
  status: SubjectiveTestStatus;
  createdBy: string;
};

export type SubjectiveTestEntryInput = {
  activityId: string;
  modelName: string;
  output: string;
  order: number;
};

export type EloRow = {
  key: string;
  modelName: string;
  categorySlug: string;
  categoryName: string;
  elo: number;
  gameCount: number;
  activityCount: number;
};

const TITLE_MAX = 160;
const URL_MAX = 500;
const REQUIREMENT_MAX = 20000;
const RESULT_NOTE_MAX = 20000;
const MODEL_NAME_MAX = 120;
const OUTPUT_MAX = 50000;
const INITIAL_ELO = 1500;
const K = 32;

function normalizeActivityInput(input: SubjectiveTestActivityInput) {
  return {
    title: input.title.trim(),
    categoryId: input.categoryId,
    requirement: input.requirement.trim(),
    resultNote: input.resultNote?.trim() || null,
    linuxdoUrl: input.linuxdoUrl?.trim() || null,
    status: input.status,
    createdBy: input.createdBy,
  };
}

function validateActivityInput(input: SubjectiveTestActivityInput) {
  const data = normalizeActivityInput(input);
  if (!data.title) throw new Error("活动标题不能为空");
  if (data.title.length > TITLE_MAX) throw new Error(`活动标题超过 ${TITLE_MAX} 字符`);
  if (!Number.isInteger(data.categoryId)) throw new Error("请选择模型类型");
  if (!data.requirement) throw new Error("测试需求不能为空");
  if (data.requirement.length > REQUIREMENT_MAX) throw new Error(`测试需求超过 ${REQUIREMENT_MAX} 字符`);
  if (data.resultNote && data.resultNote.length > RESULT_NOTE_MAX) throw new Error(`结果说明超过 ${RESULT_NOTE_MAX} 字符`);
  if (data.linuxdoUrl && data.linuxdoUrl.length > URL_MAX) throw new Error(`活动帖链接超过 ${URL_MAX} 字符`);
  data.linuxdoUrl = normalizeLinuxDoUrl(data.linuxdoUrl);
  return data;
}

function normalizeEntryInput(input: SubjectiveTestEntryInput) {
  return {
    activityId: input.activityId,
    modelName: input.modelName.trim(),
    output: input.output.trim(),
    order: input.order,
  };
}

function validateEntryInput(input: SubjectiveTestEntryInput) {
  const data = normalizeEntryInput(input);
  if (!data.activityId) throw new Error("活动 ID 缺失");
  if (!data.modelName) throw new Error("模型名不能为空");
  if (data.modelName.length > MODEL_NAME_MAX) throw new Error(`模型名超过 ${MODEL_NAME_MAX} 字符`);
  if (!data.output) throw new Error("模型输出不能为空");
  if (data.output.length > OUTPUT_MAX) throw new Error(`模型输出超过 ${OUTPUT_MAX} 字符`);
  if (!Number.isInteger(data.order)) throw new Error("排序号必须是整数");
  return data;
}

export async function listSubjectiveTestCategories() {
  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(inArray(categories.slug, ["text", "image", "video"]))
    .orderBy(asc(categories.order), asc(categories.id));
}

export async function listPublicSubjectiveTestActivities(categorySlug?: string) {
  const categoryFilter = categorySlug ? eq(categories.slug, categorySlug) : undefined;
  const rows = await db
    .select({
      id: subjectiveTestActivities.id,
      title: subjectiveTestActivities.title,
      requirement: subjectiveTestActivities.requirement,
      resultNote: subjectiveTestActivities.resultNote,
      linuxdoUrl: subjectiveTestActivities.linuxdoUrl,
      createdAt: subjectiveTestActivities.createdAt,
      categorySlug: categories.slug,
      categoryName: categories.name,
      voteCount: countDistinct(subjectiveTestVotes.id),
    })
    .from(subjectiveTestActivities)
    .innerJoin(categories, eq(subjectiveTestActivities.categoryId, categories.id))
    .leftJoin(subjectiveTestVotes, eq(subjectiveTestVotes.activityId, subjectiveTestActivities.id))
    .where(and(eq(subjectiveTestActivities.status, "published"), categoryFilter))
    .groupBy(
      subjectiveTestActivities.id,
      categories.slug,
      categories.name,
    )
    .orderBy(desc(subjectiveTestActivities.createdAt));
  return rows;
}

async function loadEloSource(categorySlug?: string, activityId?: string) {
  const rows = await db
    .select({
      activityId: subjectiveTestActivities.id,
      categorySlug: categories.slug,
      categoryName: categories.name,
      entryId: subjectiveTestEntries.id,
      modelName: subjectiveTestEntries.modelName,
      voteId: subjectiveTestVotes.id,
      rank: subjectiveTestVoteItems.rank,
    })
    .from(subjectiveTestActivities)
    .innerJoin(categories, eq(subjectiveTestActivities.categoryId, categories.id))
    .innerJoin(subjectiveTestEntries, eq(subjectiveTestEntries.activityId, subjectiveTestActivities.id))
    .leftJoin(subjectiveTestVoteItems, eq(subjectiveTestVoteItems.entryId, subjectiveTestEntries.id))
    .leftJoin(subjectiveTestVotes, eq(subjectiveTestVoteItems.voteId, subjectiveTestVotes.id))
    .where(and(
      eq(subjectiveTestActivities.status, "published"),
      categorySlug ? eq(categories.slug, categorySlug) : undefined,
      activityId ? eq(subjectiveTestActivities.id, activityId) : undefined,
    ))
    .orderBy(asc(subjectiveTestActivities.createdAt), asc(subjectiveTestVotes.createdAt), asc(subjectiveTestVoteItems.rank));
  return rows;
}

function expected(a: number, b: number) {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

function sortEloRows(rows: EloRow[]) {
  return rows.sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo;
    if (b.gameCount !== a.gameCount) return b.gameCount - a.gameCount;
    if (b.activityCount !== a.activityCount) return b.activityCount - a.activityCount;
    return a.modelName.localeCompare(b.modelName, "zh-CN");
  });
}

export async function getSubjectiveTestEloLeaderboard(categorySlug?: string): Promise<EloRow[]> {
  const rows = await loadEloSource(categorySlug);
  const map = new Map<string, EloRow & { activityIds: Set<string> }>();
  const votes = new Map<string, { key: string; rank: number }[]>();

  for (const row of rows) {
    const key = `${row.categorySlug}:${row.modelName}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        modelName: row.modelName,
        categorySlug: row.categorySlug,
        categoryName: row.categoryName,
        elo: INITIAL_ELO,
        gameCount: 0,
        activityCount: 0,
        activityIds: new Set<string>(),
      });
    }
    map.get(key)!.activityIds.add(row.activityId);
    if (row.voteId && row.rank !== null) {
      votes.set(row.voteId, [...(votes.get(row.voteId) ?? []), { key, rank: row.rank }]);
    }
  }

  for (const vote of votes.values()) {
    const ranked = vote.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < ranked.length; i += 1) {
      for (let j = i + 1; j < ranked.length; j += 1) {
        const winner = map.get(ranked[i].key)!;
        const loser = map.get(ranked[j].key)!;
        const winnerExpected = expected(winner.elo, loser.elo);
        const loserExpected = expected(loser.elo, winner.elo);
        winner.elo += K * (1 - winnerExpected);
        loser.elo += K * (0 - loserExpected);
        winner.gameCount += 1;
        loser.gameCount += 1;
      }
    }
  }

  return sortEloRows([...map.values()].map(({ activityIds, ...row }) => ({
    ...row,
    elo: Math.round(row.elo),
    activityCount: activityIds.size,
  })));
}

export async function getSubjectiveTestActivityElo(activityId: string): Promise<EloRow[]> {
  const rows = await loadEloSource(undefined, activityId);
  const map = new Map<string, EloRow>();
  const votes = new Map<string, { key: string; rank: number }[]>();

  for (const row of rows) {
    const key = row.entryId;
    if (!map.has(key)) {
      map.set(key, {
        key,
        modelName: row.modelName,
        categorySlug: row.categorySlug,
        categoryName: row.categoryName,
        elo: INITIAL_ELO,
        gameCount: 0,
        activityCount: 1,
      });
    }
    if (row.voteId && row.rank !== null) {
      votes.set(row.voteId, [...(votes.get(row.voteId) ?? []), { key, rank: row.rank }]);
    }
  }

  for (const vote of votes.values()) {
    const ranked = vote.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < ranked.length; i += 1) {
      for (let j = i + 1; j < ranked.length; j += 1) {
        const winner = map.get(ranked[i].key)!;
        const loser = map.get(ranked[j].key)!;
        const winnerExpected = expected(winner.elo, loser.elo);
        const loserExpected = expected(loser.elo, winner.elo);
        winner.elo += K * (1 - winnerExpected);
        loser.elo += K * (0 - loserExpected);
        winner.gameCount += 1;
        loser.gameCount += 1;
      }
    }
  }

  return sortEloRows([...map.values()].map((row) => ({ ...row, elo: Math.round(row.elo) })));
}

export async function getPublicSubjectiveTestActivityDetail(id: string, userId?: string) {
  const [activity] = await db
    .select({
      id: subjectiveTestActivities.id,
      title: subjectiveTestActivities.title,
      requirement: subjectiveTestActivities.requirement,
      resultNote: subjectiveTestActivities.resultNote,
      linuxdoUrl: subjectiveTestActivities.linuxdoUrl,
      createdAt: subjectiveTestActivities.createdAt,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(subjectiveTestActivities)
    .innerJoin(categories, eq(subjectiveTestActivities.categoryId, categories.id))
    .where(and(eq(subjectiveTestActivities.id, id), eq(subjectiveTestActivities.status, "published")));
  if (!activity) return null;

  const [entries, voteRows, participantRows, ranking] = await Promise.all([
    db
      .select({
        id: subjectiveTestEntries.id,
        modelName: subjectiveTestEntries.modelName,
        output: subjectiveTestEntries.output,
        order: subjectiveTestEntries.order,
      })
      .from(subjectiveTestEntries)
      .where(eq(subjectiveTestEntries.activityId, id))
      .orderBy(asc(subjectiveTestEntries.order), asc(subjectiveTestEntries.createdAt)),
    userId
      ? db
          .select({ entryId: subjectiveTestVoteItems.entryId, rank: subjectiveTestVoteItems.rank })
          .from(subjectiveTestVotes)
          .innerJoin(subjectiveTestVoteItems, eq(subjectiveTestVoteItems.voteId, subjectiveTestVotes.id))
          .where(and(eq(subjectiveTestVotes.activityId, id), eq(subjectiveTestVotes.userId, userId)))
      : Promise.resolve([]),
    db
      .select({ value: countDistinct(subjectiveTestVotes.userId) })
      .from(subjectiveTestVotes)
      .where(eq(subjectiveTestVotes.activityId, id)),
    getSubjectiveTestActivityElo(id),
  ]);

  return {
    ...activity,
    entries,
    userRanks: new Map(voteRows.map((row) => [row.entryId, row.rank])),
    voteCount: Number(participantRows[0]?.value ?? 0),
    ranking,
  };
}

export async function submitSubjectiveTestVote(activityId: string, userId: string, ranks: { entryId: string; rank: number }[]) {
  const [activity] = await db
    .select({ id: subjectiveTestActivities.id })
    .from(subjectiveTestActivities)
    .where(and(eq(subjectiveTestActivities.id, activityId), eq(subjectiveTestActivities.status, "published")));
  if (!activity) throw new Error("活动不存在或未发布");

  const entries = await db
    .select({ id: subjectiveTestEntries.id })
    .from(subjectiveTestEntries)
    .where(eq(subjectiveTestEntries.activityId, activityId));
  if (entries.length < 2) throw new Error("活动至少需要两个模型输出才能投票");

  const entryIds = new Set(entries.map((entry) => entry.id));
  const rankSet = new Set<number>();
  if (ranks.length !== entries.length) throw new Error("请为所有模型输出排序");
  for (const item of ranks) {
    if (!entryIds.has(item.entryId)) throw new Error("投票包含无效的模型输出");
    if (!Number.isInteger(item.rank) || item.rank < 1 || item.rank > entries.length) throw new Error("排序名次无效");
    if (rankSet.has(item.rank)) throw new Error("名次不能重复");
    rankSet.add(item.rank);
  }

  await db.transaction(async (tx) => {
    const [vote] = await tx
      .insert(subjectiveTestVotes)
      .values({ activityId, userId })
      .onConflictDoUpdate({
        target: [subjectiveTestVotes.activityId, subjectiveTestVotes.userId],
        set: { updatedAt: new Date() },
      })
      .returning({ id: subjectiveTestVotes.id });

    await tx.delete(subjectiveTestVoteItems).where(eq(subjectiveTestVoteItems.voteId, vote.id));
    await tx.insert(subjectiveTestVoteItems).values(
      ranks.map((item) => ({ voteId: vote.id, entryId: item.entryId, rank: item.rank })),
    );
  });
}

export async function listSubjectiveTestsForAdmin(filter: { status?: SubjectiveTestStatus } = {}) {
  const activityRows = await db
    .select({
      id: subjectiveTestActivities.id,
      title: subjectiveTestActivities.title,
      requirement: subjectiveTestActivities.requirement,
      resultNote: subjectiveTestActivities.resultNote,
      linuxdoUrl: subjectiveTestActivities.linuxdoUrl,
      status: subjectiveTestActivities.status,
      createdAt: subjectiveTestActivities.createdAt,
      updatedAt: subjectiveTestActivities.updatedAt,
      createdBy: subjectiveTestActivities.createdBy,
      creatorName: users.username,
      categoryId: categories.id,
      categorySlug: categories.slug,
      categoryName: categories.name,
      voteCount: countDistinct(subjectiveTestVotes.userId),
    })
    .from(subjectiveTestActivities)
    .innerJoin(categories, eq(subjectiveTestActivities.categoryId, categories.id))
    .innerJoin(users, eq(subjectiveTestActivities.createdBy, users.id))
    .leftJoin(subjectiveTestVotes, eq(subjectiveTestVotes.activityId, subjectiveTestActivities.id))
    .where(filter.status ? eq(subjectiveTestActivities.status, filter.status) : undefined)
    .groupBy(subjectiveTestActivities.id, categories.id, users.username)
    .orderBy(desc(subjectiveTestActivities.createdAt));

  const entries = activityRows.length === 0
    ? []
    : await db
        .select({
          id: subjectiveTestEntries.id,
          activityId: subjectiveTestEntries.activityId,
          modelName: subjectiveTestEntries.modelName,
          output: subjectiveTestEntries.output,
          order: subjectiveTestEntries.order,
          createdAt: subjectiveTestEntries.createdAt,
          updatedAt: subjectiveTestEntries.updatedAt,
        })
        .from(subjectiveTestEntries)
        .where(inArray(subjectiveTestEntries.activityId, activityRows.map((row) => row.id)))
        .orderBy(asc(subjectiveTestEntries.order), asc(subjectiveTestEntries.createdAt));

  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    grouped.set(entry.activityId, [...(grouped.get(entry.activityId) ?? []), entry]);
  }

  const rankings = await Promise.all(activityRows.map((row) => getSubjectiveTestActivityElo(row.id)));
  const rankingMap = new Map(activityRows.map((row, index) => [row.id, rankings[index]]));

  return activityRows.map((row) => ({
    ...row,
    voteCount: Number(row.voteCount),
    entries: grouped.get(row.id) ?? [],
    ranking: rankingMap.get(row.id) ?? [],
  }));
}

export async function createSubjectiveTestActivity(input: SubjectiveTestActivityInput) {
  const data = validateActivityInput(input);
  const [row] = await db.insert(subjectiveTestActivities).values(data).returning();
  return row;
}

export async function updateSubjectiveTestStatus(id: string, status: SubjectiveTestStatus) {
  const [row] = await db
    .update(subjectiveTestActivities)
    .set({ status, updatedAt: new Date() })
    .where(eq(subjectiveTestActivities.id, id))
    .returning();
  if (!row) throw new Error("活动不存在");
  return row;
}

export async function updateSubjectiveTestActivity(id: string, input: Omit<SubjectiveTestActivityInput, "createdBy">) {
  const data = validateActivityInput({ ...input, createdBy: "00000000-0000-0000-0000-000000000000" });
  const [row] = await db
    .update(subjectiveTestActivities)
    .set({
      title: data.title,
      categoryId: data.categoryId,
      requirement: data.requirement,
      resultNote: data.resultNote,
      linuxdoUrl: data.linuxdoUrl,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(subjectiveTestActivities.id, id))
    .returning();
  if (!row) throw new Error("活动不存在");
  return row;
}

export async function createSubjectiveTestEntry(input: SubjectiveTestEntryInput) {
  const data = validateEntryInput(input);
  const [row] = await db.insert(subjectiveTestEntries).values(data).returning();
  return row;
}

export async function updateSubjectiveTestEntry(id: string, input: SubjectiveTestEntryInput) {
  const data = validateEntryInput(input);
  const [row] = await db
    .update(subjectiveTestEntries)
    .set({
      modelName: data.modelName,
      output: data.output,
      order: data.order,
      updatedAt: new Date(),
    })
    .where(and(eq(subjectiveTestEntries.id, id), eq(subjectiveTestEntries.activityId, data.activityId)))
    .returning();
  if (!row) throw new Error("模型输出不存在");
  return row;
}

export async function deleteSubjectiveTestEntry(id: string) {
  const rows = await db
    .delete(subjectiveTestEntries)
    .where(eq(subjectiveTestEntries.id, id))
    .returning({ id: subjectiveTestEntries.id });
  return rows.length > 0;
}
