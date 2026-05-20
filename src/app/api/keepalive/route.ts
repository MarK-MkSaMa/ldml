/**
 * Keepalive 端点
 *
 * 由外部 cron（VPS 上的定时任务）每隔几分钟请求一次，
 * 让 Neon 数据库不进入 autosuspend 状态。
 *
 * 同时让 Vercel 函数也保持热（避免函数冷启动）。
 *
 * 安全考虑：用 token 简单防滥用，外部调用需要带 ?token=xxx
 */
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expected = process.env.KEEPALIVE_TOKEN;

  if (!expected || token !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  // 简单查询让 Neon 唤醒
  const t0 = Date.now();
  await db.execute(sql`SELECT 1`);
  const dt = Date.now() - t0;

  return Response.json({ ok: true, durationMs: dt });
}
