/**
 * 清空所有真实投票数据
 *
 * 删除范围：votes / vote_history / model_stats
 * 保留：licenses / categories / dimensions / users / models / announcements / comments / ...
 *
 * 运行：npm run db:reset-votes -- --yes
 *   不加 --yes 只打印预览，不执行。
 */
import { db } from "./index";
import { votes, voteHistory, modelStats } from "./schema";
import { count } from "drizzle-orm";

async function main() {
  const yes = process.argv.includes("--yes");

  const [voteRows, historyRows, statsRows] = await Promise.all([
    db.select({ value: count() }).from(votes),
    db.select({ value: count() }).from(voteHistory),
    db.select({ value: count() }).from(modelStats),
  ]);

  console.log("将要删除：");
  console.log(`  votes        : ${voteRows[0].value} 行`);
  console.log(`  vote_history : ${historyRows[0].value} 行`);
  console.log(`  model_stats  : ${statsRows[0].value} 行`);

  if (!yes) {
    console.log("\n（预览模式）加 -- --yes 真正执行删除");
    process.exit(0);
  }

  console.log("\n开始删除...");
  await db.delete(modelStats);
  await db.delete(voteHistory);
  await db.delete(votes);
  console.log("✅ 清除完成");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ 失败:", e);
  process.exit(1);
});
