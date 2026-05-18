/**
 * 数据库客户端
 *
 * 使用 postgres.js 驱动 + Drizzle ORM
 * 全应用共享同一个连接池实例（开发模式下通过 globalThis 避免热重载重复创建）
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// 开发环境 Next.js 会热重载，避免每次都创建新连接池
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    max: 10, // 连接池最大连接数
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
export type Db = typeof db;
