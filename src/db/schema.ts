/**
 * 数据库 Schema —— 对应方案文档第六节
 *
 * 使用 Drizzle ORM 的 Postgres 方言定义所有表
 * 修改本文件后，需要执行 `npm run db:push` 把变更应用到数据库
 */
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  bigint,
  date,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  serial,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// 1. 用户表
// ============================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Linux DO 返回的用户 ID（数字），用 bigint 避免越界
    linuxdoId: bigint("linuxdo_id", { mode: "number" }).notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    // Linux DO 信任等级 0-4，决定能否投票/评论
    trustLevel: integer("trust_level").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
    isBanned: boolean("is_banned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_linuxdo_id_idx").on(t.linuxdoId)],
);

// ============================================================
// 2. 大类（本地模型 / 云端模型）
// ============================================================
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // open-source | closed-source
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

// ============================================================
// 3. 分类（文字 / 生图 / 生视频）
// ============================================================
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // text | image | video
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

// ============================================================
// 4. 维度（每个分类有自己的一组维度）
// ============================================================
export const dimensions = pgTable(
  "dimensions",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // code | rp | task | ...
    name: text("name").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
  },
  (t) => [uniqueIndex("dimensions_category_slug_idx").on(t.categoryId, t.slug)],
);

// ============================================================
// 5. 模型
// ============================================================
import { MODEL_STATUSES } from "@/lib/model-status";
export { MODEL_STATUSES as modelStatusEnum };
export type { ModelStatus } from "@/lib/model-status";
const modelStatusEnum = MODEL_STATUSES;

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    vendor: text("vendor"), // OpenAI / Anthropic / ...
    licenseText: text("license_text"), // Proprietary / MIT / Apache 2.0 / ...
    homepageUrl: text("homepage_url"),
    releasedAt: date("released_at"),
    status: text("status", { enum: modelStatusEnum })
      .notNull()
      .default("draft"),
    pinned: boolean("pinned").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("models_status_idx").on(t.status),
    index("models_category_idx").on(t.categoryId),
  ],
);

// ============================================================
// 6. 模型申请工单
// ============================================================
export const modelRequestStatusEnum = ["pending", "approved", "rejected"] as const;
export type ModelRequestStatus = (typeof modelRequestStatusEnum)[number];

export const benchmarkQuestionStatusEnum = [
  "pending",
  "approved",
  "rejected",
  "archived",
] as const;
export type BenchmarkQuestionStatus = (typeof benchmarkQuestionStatusEnum)[number];

export const subjectiveTestStatusEnum = ["draft", "published", "archived"] as const;
export type SubjectiveTestStatus = (typeof subjectiveTestStatusEnum)[number];

export const modelRequests = pgTable(
  "model_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    vendor: text("vendor"),
    licenseText: text("license_text"),
    homepageUrl: text("homepage_url"),
    releasedAt: date("released_at"),
    status: text("status", { enum: modelRequestStatusEnum })
      .notNull()
      .default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
    createdModelId: uuid("created_model_id").references(() => models.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("model_requests_status_idx").on(t.status),
    index("model_requests_requester_idx").on(t.requesterId),
    index("model_requests_slug_idx").on(t.slug),
  ],
);

// ============================================================
// 7. 基准测试题库与结果
// ============================================================
export const benchmarkQuestions = pgTable(
  "benchmark_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id),
    question: text("question").notNull(),
    referenceAnswer: text("reference_answer").notNull(),
    judgeNote: text("judge_note"),
    status: text("status", { enum: benchmarkQuestionStatusEnum })
      .notNull()
      .default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("benchmark_questions_status_idx").on(t.status),
    index("benchmark_questions_uploader_idx").on(t.uploaderId),
  ],
);

export const benchmarkResults = pgTable(
  "benchmark_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => benchmarkQuestions.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    modelAnswer: text("model_answer"),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("benchmark_results_question_model_idx").on(t.questionId, t.modelName),
    index("benchmark_results_model_idx").on(t.modelName),
  ],
);

// ============================================================
// 8. 主观测试活动 / 输出 / 排序投票
// ============================================================
export const subjectiveTestActivities = pgTable(
  "subjective_test_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    title: text("title").notNull(),
    requirement: text("requirement").notNull(),
    resultNote: text("result_note"),
    linuxdoUrl: text("linuxdo_url"),
    status: text("status", { enum: subjectiveTestStatusEnum })
      .notNull()
      .default("draft"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subjective_test_activities_category_idx").on(t.categoryId),
    index("subjective_test_activities_status_idx").on(t.status),
  ],
);

export const subjectiveTestEntries = pgTable(
  "subjective_test_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => subjectiveTestActivities.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    output: text("output").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subjective_test_entries_activity_idx").on(t.activityId),
    index("subjective_test_entries_model_idx").on(t.modelName),
  ],
);

export const subjectiveTestVotes = pgTable(
  "subjective_test_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => subjectiveTestActivities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subjective_test_votes_activity_user_idx").on(t.activityId, t.userId),
    index("subjective_test_votes_activity_idx").on(t.activityId),
  ],
);

export const subjectiveTestVoteItems = pgTable(
  "subjective_test_vote_items",
  {
    voteId: uuid("vote_id")
      .notNull()
      .references(() => subjectiveTestVotes.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => subjectiveTestEntries.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.voteId, t.entryId] }),
    uniqueIndex("subjective_test_vote_items_vote_rank_idx").on(t.voteId, t.rank),
  ],
);

// ============================================================
// 8. 评分（每用户对每模型每维度一条当前记录）
// ============================================================
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    dimensionId: integer("dimension_id")
      .notNull()
      .references(() => dimensions.id, { onDelete: "cascade" }),
    // 1-10 整数
    // 弃权 = 不创建该维度的 vote 记录
    // 撤回 = 删除该记录，并在 vote_history 里追加 action="withdraw"
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_user_model_dim_idx").on(t.userId, t.modelId, t.dimensionId),
    index("votes_model_dim_idx").on(t.modelId, t.dimensionId),
  ],
);

// ============================================================
// 7. 评分历史（审计 / 反刷）
// ============================================================
export const voteHistoryActionEnum = ["create", "update", "withdraw"] as const;

export const voteHistory = pgTable("vote_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  voteId: uuid("vote_id"), // 撤回时原 vote 已删除，所以不加外键
  userId: uuid("user_id").notNull(),
  modelId: uuid("model_id").notNull(),
  dimensionId: integer("dimension_id").notNull(),
  score: integer("score").notNull(),
  action: text("action", { enum: voteHistoryActionEnum }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ipHash: text("ip_hash"), // SHA256(IP+salt)，不存原始 IP
  userAgent: text("user_agent"),
});

// ============================================================
// 8. 模型评分聚合缓存（每个 (model, dimension) 一行）
// ============================================================
export const modelStats = pgTable(
  "model_stats",
  {
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    dimensionId: integer("dimension_id")
      .notNull()
      .references(() => dimensions.id, { onDelete: "cascade" }),
    voteCount: integer("vote_count").notNull().default(0),
    // 真实算术均分，展示给用户看
    avgScore: numeric("avg_score", { precision: 4, scale: 2 }),
    // 贝叶斯加权分，用于排序
    weightedScore: numeric("weighted_score", { precision: 4, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.modelId, t.dimensionId] })],
);

// ============================================================
// 9. 操作日志（后台审计）
// ============================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(), // model.create | user.ban | ...
  targetType: text("target_type"),
  targetId: text("target_id"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 10. 评论
// ============================================================
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 二级回复时指向父评论；最多两层嵌套
    parentId: uuid("parent_id"),
    content: text("content").notNull(), // Markdown 原文
    contentHtml: text("content_html").notNull(), // 渲染并 sanitize 后的 HTML
    likeCount: integer("like_count").notNull().default(0),
    dislikeCount: integer("dislike_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    isHidden: boolean("is_hidden").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
  },
  (t) => [
    index("comments_model_created_idx").on(t.modelId, t.createdAt),
    index("comments_user_idx").on(t.userId),
    index("comments_parent_idx").on(t.parentId),
  ],
);

// ============================================================
// 11. 评论点赞 / 点踩
// ============================================================
export const reactionEnum = ["like", "dislike"] as const;

export const commentReactions = pgTable(
  "comment_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: text("reaction", { enum: reactionEnum }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("comment_reactions_comment_user_idx").on(t.commentId, t.userId)],
);

// ============================================================
// 12. 评论举报
// ============================================================
export const reportStatusEnum = ["pending", "resolved", "rejected"] as const;
export const reportReasonEnum = ["spam", "abuse", "off_topic", "other"] as const;

export const commentReports = pgTable(
  "comment_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: reportReasonEnum }).notNull(),
    detail: text("detail"),
    status: text("status", { enum: reportStatusEnum }).notNull().default("pending"),
    handledBy: uuid("handled_by").references(() => users.id),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("comment_reports_comment_reporter_idx").on(t.commentId, t.reporterId),
    index("comment_reports_status_idx").on(t.status),
  ],
);

// ============================================================
// 13. 公告
// ============================================================
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(), // Markdown 原文
    contentHtml: text("content_html").notNull(), // 渲染并 sanitize 后的 HTML
    isActive: boolean("is_active").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("announcements_active_published_idx").on(t.isActive, t.publishedAt),
  ],
);

// ============================================================
// 14. 关键字黑名单（后台维护）
// ============================================================
export const banKeywordActionEnum = ["block", "hide"] as const;

export const bannedKeywords = pgTable("banned_keywords", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  isRegex: boolean("is_regex").notNull().default(false),
  action: text("action", { enum: banKeywordActionEnum }).notNull().default("block"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// 关系定义（让 Drizzle 的查询 API 支持 .with() 联表查询）
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  votes: many(votes),
  comments: many(comments),
  modelRequests: many(modelRequests, { relationName: "requester" }),
  reviewedModelRequests: many(modelRequests, { relationName: "reviewer" }),
  benchmarkQuestions: many(benchmarkQuestions, { relationName: "benchmarkUploader" }),
  reviewedBenchmarkQuestions: many(benchmarkQuestions, { relationName: "benchmarkReviewer" }),
  benchmarkResults: many(benchmarkResults),
  subjectiveTestActivities: many(subjectiveTestActivities),
  subjectiveTestVotes: many(subjectiveTestVotes),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  models: many(models),
  dimensions: many(dimensions),
  modelRequests: many(modelRequests),
  subjectiveTestActivities: many(subjectiveTestActivities),
}));

export const dimensionsRelations = relations(dimensions, ({ one, many }) => ({
  category: one(categories, {
    fields: [dimensions.categoryId],
    references: [categories.id],
  }),
  votes: many(votes),
  stats: many(modelStats),
}));

export const modelsRelations = relations(models, ({ one, many }) => ({
  category: one(categories, {
    fields: [models.categoryId],
    references: [categories.id],
  }),
  votes: many(votes),
  comments: many(comments),
  stats: many(modelStats),
  modelRequests: many(modelRequests),
}));

export const modelRequestsRelations = relations(modelRequests, ({ one }) => ({
  requester: one(users, {
    fields: [modelRequests.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  category: one(categories, {
    fields: [modelRequests.categoryId],
    references: [categories.id],
  }),
  reviewer: one(users, {
    fields: [modelRequests.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
  createdModel: one(models, {
    fields: [modelRequests.createdModelId],
    references: [models.id],
  }),
}));

export const benchmarkQuestionsRelations = relations(benchmarkQuestions, ({ one, many }) => ({
  uploader: one(users, {
    fields: [benchmarkQuestions.uploaderId],
    references: [users.id],
    relationName: "benchmarkUploader",
  }),
  reviewer: one(users, {
    fields: [benchmarkQuestions.reviewedBy],
    references: [users.id],
    relationName: "benchmarkReviewer",
  }),
  results: many(benchmarkResults),
}));

export const benchmarkResultsRelations = relations(benchmarkResults, ({ one }) => ({
  question: one(benchmarkQuestions, {
    fields: [benchmarkResults.questionId],
    references: [benchmarkQuestions.id],
  }),
  creator: one(users, {
    fields: [benchmarkResults.createdBy],
    references: [users.id],
  }),
}));

export const subjectiveTestActivitiesRelations = relations(subjectiveTestActivities, ({ one, many }) => ({
  category: one(categories, {
    fields: [subjectiveTestActivities.categoryId],
    references: [categories.id],
  }),
  creator: one(users, {
    fields: [subjectiveTestActivities.createdBy],
    references: [users.id],
  }),
  entries: many(subjectiveTestEntries),
  votes: many(subjectiveTestVotes),
}));

export const subjectiveTestEntriesRelations = relations(subjectiveTestEntries, ({ one, many }) => ({
  activity: one(subjectiveTestActivities, {
    fields: [subjectiveTestEntries.activityId],
    references: [subjectiveTestActivities.id],
  }),
  voteItems: many(subjectiveTestVoteItems),
}));

export const subjectiveTestVotesRelations = relations(subjectiveTestVotes, ({ one, many }) => ({
  activity: one(subjectiveTestActivities, {
    fields: [subjectiveTestVotes.activityId],
    references: [subjectiveTestActivities.id],
  }),
  user: one(users, {
    fields: [subjectiveTestVotes.userId],
    references: [users.id],
  }),
  items: many(subjectiveTestVoteItems),
}));

export const subjectiveTestVoteItemsRelations = relations(subjectiveTestVoteItems, ({ one }) => ({
  vote: one(subjectiveTestVotes, {
    fields: [subjectiveTestVoteItems.voteId],
    references: [subjectiveTestVotes.id],
  }),
  entry: one(subjectiveTestEntries, {
    fields: [subjectiveTestVoteItems.entryId],
    references: [subjectiveTestEntries.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({ 
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  model: one(models, { fields: [votes.modelId], references: [models.id] }),
  dimension: one(dimensions, {
    fields: [votes.dimensionId],
    references: [dimensions.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  model: one(models, { fields: [comments.modelId], references: [models.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "parent",
  }),
  replies: many(comments, { relationName: "parent" }),
  reactions: many(commentReactions),
  reports: many(commentReports),
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(comments, {
    fields: [commentReactions.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentReactions.userId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));

// 显式标记 sql 已使用，避免 lint 警告（schema.ts 之外的迁移可能用到）
export const _unused = sql;
