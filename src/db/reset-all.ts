/**
 * 一键清除所有"业务数据"
 *
 * 删除：所有模型 / 投票 / 评分历史 / 模型统计 / 评论 / 评论互动 / 评论举报 / 公告 / 审计日志
 * 保留：licenses / categories / dimensions / users / banned_keywords
 *
 * 适合需要把数据库回到"配置已就绪、内容为空"的状态时用，例如上线前清场。
 *
 * 运行：npm run db:reset-all -- --yes
 */
import { db } from "./index";
import {
  models,
  votes,
  voteHistory,
  modelStats,
  comments,
  commentReactions,
  commentReports,
  announcements,
  auditLogs,
} from "./schema";
import { count } from "drizzle-orm";

async function main() {
  const yes = process.argv.includes("--yes");

  const counts = await Promise.all([
    db.select({ value: count() }).from(models),
    db.select({ value: count() }).from(votes),
    db.select({ value: count() }).from(voteHistory),
    db.select({ value: count() }).from(modelStats),
    db.select({ value: count() }).from(comments),
    db.select({ value: count() }).from(commentReactions),
    db.select({ value: count() }).from(commentReports),
    db.select({ value: count() }).from(announcements),
    db.select({ value: count() }).from(auditLogs),
  ]);
  const labels = [
    "models",
    "votes",
    "vote_history",
    "model_stats",
    "comments",
    "comment_reactions",
    "comment_reports",
    "announcements",
    "audit_logs",
  ];

  console.log("将要清空：");
  for (let i = 0; i < labels.length; i++) {
    console.log(`  ${labels[i].padEnd(20)}: ${counts[i][0].value} 行`);
  }
  console.log("\n保留：licenses / categories / dimensions / users / banned_keywords");

  if (!yes) {
    console.log("\n（预览模式）加 -- --yes 真正执行删除");
    process.exit(0);
  }

  console.log("\n开始删除...");
  // 按依赖顺序删
  await db.delete(commentReports);
  await db.delete(commentReactions);
  await db.delete(comments);
  await db.delete(modelStats);
  await db.delete(voteHistory);
  await db.delete(votes);
  await db.delete(models);
  await db.delete(announcements);
  await db.delete(auditLogs);
  console.log("✅ 清除完成");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ 失败:", e);
  process.exit(1);
});
