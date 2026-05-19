/**
 * 删除演示模型
 *
 * 删除 seed-demo.ts 中插入的 9 个模型。
 * 因为外键 cascade，相关的 votes / vote_history / model_stats / comments 一起删。
 *
 * 运行：npm run db:reset-demo -- --yes
 */
import { db } from "./index";
import { models } from "./schema";
import { inArray } from "drizzle-orm";

const DEMO_SLUGS = [
  "gpt-5",
  "claude-sonnet-4-5",
  "gemini-2-5-pro",
  "deepseek-v3-2",
  "qwen3-coder",
  "minimax-m2",
  "midjourney-v7",
  "flux-1-1-pro",
  "sora-2",
];

async function main() {
  const yes = process.argv.includes("--yes");

  const found = await db
    .select({ slug: models.slug, name: models.name })
    .from(models)
    .where(inArray(models.slug, DEMO_SLUGS));

  console.log(`匹配到 ${found.length} 个演示模型：`);
  for (const m of found) console.log(`  - ${m.slug} (${m.name})`);

  if (found.length === 0) {
    console.log("（数据库里没有演示模型）");
    process.exit(0);
  }

  if (!yes) {
    console.log("\n（预览模式）加 -- --yes 真正执行删除");
    console.log("注意：会同时删除相关的所有投票、评论、统计。");
    process.exit(0);
  }

  console.log("\n开始删除...");
  await db.delete(models).where(inArray(models.slug, DEMO_SLUGS));
  console.log("✅ 清除完成");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ 失败:", e);
  process.exit(1);
});
