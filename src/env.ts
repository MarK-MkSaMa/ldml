import { z } from "zod";

/**
 * 在 Node 脚本场景（如 src/db/seed.ts）下，进程启动时 process.env 尚未注入 .env.local。
 * Next.js 运行时不需要这一步（自带加载），但这里加载也是 no-op（不会覆盖已有变量）。
 * 因此在所有场景下都安全。
 */
if (typeof window === "undefined" && !process.env.__ENV_LOADED__) {
    // 动态 require 避免在浏览器侧打包 dotenv
  const dotenv = require("dotenv") as typeof import("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
  process.env.__ENV_LOADED__ = "1";
}

/**
 * 环境变量 schema
 * 在应用启动时校验所有必需的环境变量是否存在和格式正确
 * 如果缺失或错误，会立即抛出可读的错误信息
 */
/**
 * 必需变量：缺失会立即抛错
 * 可选变量：缺失返回 undefined / 默认值，等用到时再各自报错
 *
 * 这样可以让仅依赖数据库的脚本（如 seed）在 Auth/OAuth 配置未填时也能运行。
 */
const envSchema = z.object({
  // 数据库（必需）
  DATABASE_URL: z.string().url("DATABASE_URL 必须是合法的连接串"),

  // Auth.js（运行时使用，开发期可空）
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().default(""),

  // Linux DO OAuth（运行时使用，开发期可空）
  LINUXDO_CLIENT_ID: z.string().default(""),
  LINUXDO_CLIENT_SECRET: z.string().default(""),

  // 管理员列表，逗号分隔的 Linux DO 用户 ID
  ADMIN_LINUXDO_IDS: z
    .string()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export const env = envSchema.parse(process.env);

/**
 * 在真正需要某项配置时调用，强制其存在
 * 用法：const secret = requireEnv("AUTH_SECRET");
 */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`环境变量 ${key} 未配置，请检查 .env.local`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
