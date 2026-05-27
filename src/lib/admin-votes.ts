import { db } from "@/db";
import {
  auditLogs,
  categories,
  dimensions,
  models,
  users,
  votes,
  voteHistory,
  type ModelStatus,
} from "@/db/schema";
import { recomputeModelStat } from "@/lib/votes";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type AdminVoteModelRow = {
  id: string;
  name: string;
  slug: string;
  vendor: string | null;
  categoryId: number;
  status: ModelStatus;
  voteUsers: number;
  voteCount: number;
  lastVotedAt: Date | null;
};

export type AdminModelVotes = {
  model: {
    id: string;
    name: string;
    slug: string;
    vendor: string | null;
    categoryId: number;
    status: ModelStatus;
  };
  category: {
    id: number;
    name: string;
    slug: string;
  };
  dimensions: {
    id: number;
    name: string;
    slug: string;
    order: number;
  }[];
  users: {
    user: {
      id: string;
      username: string;
      displayName: string | null;
      linuxdoId: number;
      trustLevel: number;
      isBanned: boolean;
    };
    votes: {
      dimensionId: number;
      dimensionName: string;
      score: number;
      updatedAt: Date;
      createdAt: Date;
    }[];
  }[];
};

export async function listVoteModelsForAdmin({
  categoryId,
}: {
  categoryId?: number;
} = {}): Promise<AdminVoteModelRow[]> {
  const voteUsers = sql<number>`count(distinct ${votes.userId})`;
  const voteCount = sql<number>`count(${votes.id})`;
  const lastVotedAt = sql<Date | null>`max(${votes.updatedAt})`;

  const query = db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      vendor: models.vendor,
      categoryId: models.categoryId,
      status: models.status,
      voteUsers,
      voteCount,
      lastVotedAt,
    })
    .from(models)
    .leftJoin(votes, eq(votes.modelId, models.id))
    .groupBy(models.id);

  const filtered = categoryId === undefined ? query : query.where(eq(models.categoryId, categoryId));
  const rows = await filtered.orderBy(desc(lastVotedAt), asc(models.name));

  return rows.map((row) => ({
    ...row,
    voteUsers: Number(row.voteUsers),
    voteCount: Number(row.voteCount),
  }));
}

export async function getModelVotesForAdmin(modelId: string): Promise<AdminModelVotes | null> {
  const [modelRow] = await db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      vendor: models.vendor,
      categoryId: models.categoryId,
      status: models.status,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(models)
    .innerJoin(categories, eq(categories.id, models.categoryId))
    .where(eq(models.id, modelId));

  if (!modelRow) return null;

  const [dimensionRows, voteRows] = await Promise.all([
    db
      .select({
        id: dimensions.id,
        name: dimensions.name,
        slug: dimensions.slug,
        order: dimensions.order,
      })
      .from(dimensions)
      .where(eq(dimensions.categoryId, modelRow.categoryId))
      .orderBy(asc(dimensions.order), asc(dimensions.id)),
    db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        linuxdoId: users.linuxdoId,
        trustLevel: users.trustLevel,
        isBanned: users.isBanned,
        dimensionId: votes.dimensionId,
        dimensionName: dimensions.name,
        score: votes.score,
        updatedAt: votes.updatedAt,
        createdAt: votes.createdAt,
      })
      .from(votes)
      .innerJoin(users, eq(users.id, votes.userId))
      .innerJoin(dimensions, eq(dimensions.id, votes.dimensionId))
      .where(eq(votes.modelId, modelId))
      .orderBy(asc(users.username), asc(dimensions.order), asc(dimensions.id)),
  ]);

  const grouped = new Map<
    string,
    AdminModelVotes["users"][number]
  >();

  for (const row of voteRows) {
    let item = grouped.get(row.userId);
    if (!item) {
      item = {
        user: {
          id: row.userId,
          username: row.username,
          displayName: row.displayName,
          linuxdoId: row.linuxdoId,
          trustLevel: row.trustLevel,
          isBanned: row.isBanned,
        },
        votes: [],
      };
      grouped.set(row.userId, item);
    }
    item.votes.push({
      dimensionId: row.dimensionId,
      dimensionName: row.dimensionName,
      score: row.score,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    });
  }

  return {
    model: {
      id: modelRow.id,
      name: modelRow.name,
      slug: modelRow.slug,
      vendor: modelRow.vendor,
      categoryId: modelRow.categoryId,
      status: modelRow.status,
    },
    category: modelRow.category,
    dimensions: dimensionRows,
    users: Array.from(grouped.values()),
  };
}

export async function withdrawVoteAdmin({
  adminId,
  userId,
  modelId,
  dimensionId,
}: {
  adminId: string;
  userId: string;
  modelId: string;
  dimensionId: number;
}): Promise<boolean> {
  const [existing] = await db
    .select({ id: votes.id, score: votes.score })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.modelId, modelId),
        eq(votes.dimensionId, dimensionId),
      ),
    );

  if (!existing) return false;

  await db.delete(votes).where(eq(votes.id, existing.id));
  await db.insert(voteHistory).values({
    voteId: existing.id,
    userId,
    modelId,
    dimensionId,
    score: existing.score,
    action: "withdraw",
  });
  await db.insert(auditLogs).values({
    actorId: adminId,
    action: "vote.withdraw",
    targetType: "vote",
    targetId: existing.id,
    payload: {
      userId,
      modelId,
      dimensionId,
      score: existing.score,
      adminId,
    },
  });

  await recomputeModelStat(modelId, dimensionId);
  return true;
}
