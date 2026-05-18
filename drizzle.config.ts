/**
 * Drizzle Kit 配置
 *
 * 命令：
 *   npm run db:push       直接把 schema 推送到数据库（开发期方便）
 *   npm run db:generate   生成 SQL 迁移文件（生产环境推荐流程）
 *   npm run db:migrate    应用迁移文件
 *   npm run db:studio     启动 Drizzle Studio Web 界面查看 / 修改数据
 */
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 优先读 .env.local（Next.js 风格），再读 .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 输出更详细的 schema 对比日志
  verbose: true,
  // 破坏性变更前要求确认（删表 / 改列类型等）
  // 注意：strict=true 需要 TTY 交互式确认；若通过非交互式 shell 执行 db:push 会失败
  // 建议平时保持 false，要做删表/改列等危险操作前临时改回 true 并在终端里执行
  strict: false,
});
