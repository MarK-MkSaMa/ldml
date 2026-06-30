import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import * as dotenv from "dotenv";

/**
 * PostgreSQL 数据库备份脚本。
 *
 * 使用 pg_dump 生成 custom 格式备份：
 *   backups/db/YYYYMMDD-HHmmss.dump
 *
 * 依赖：运行环境必须能在 PATH 中找到 pg_dump。
 */
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL 未配置，无法备份数据库。");
  process.exit(1);
}

const backupDir = process.env.DB_BACKUP_DIR || path.join("backups", "db");
const keepCount = parseKeepCount(process.env.DB_BACKUP_KEEP);
const pgDumpCommand = resolvePgDumpCommand();

async function main() {
  await mkdir(backupDir, { recursive: true });

  const filename = `${formatTimestamp(new Date())}.dump`;
  const outputPath = path.join(backupDir, filename);

  console.log(`开始备份数据库到 ${outputPath}`);
  await runPgDump(outputPath);
  await pruneOldBackups();
  console.log(`数据库备份完成：${outputPath}`);
}

function parseKeepCount(value: string | undefined): number {
  if (!value) return 20;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 20;
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function resolvePgDumpCommand(): string {
  const configured = process.env.PG_DUMP_PATH?.trim();
  if (configured) return configured;

  const commonWindowsPaths = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
  ];
  const found = commonWindowsPaths.find((candidate) => existsSync(candidate));
  return found ?? "pg_dump";
}

function runPgDump(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      pgDumpCommand,
      [
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--file",
        outputPath,
        databaseUrl!,
      ],
      { stdio: "inherit" },
    );

    child.on("error", (error) => {
      reject(
        new Error(
          `pg_dump 启动失败：${error.message}\n请确认已安装 PostgreSQL client，或通过 PG_DUMP_PATH 指定 pg_dump.exe 的完整路径。`,
        ),
      );
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump 失败，退出码：${code}`));
    });
  });
}

async function pruneOldBackups() {
  const entries = await readdir(backupDir, { withFileTypes: true });
  const dumps = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".dump"))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const stale = dumps.slice(keepCount);
  for (const filename of stale) {
    const filePath = path.join(backupDir, filename);
    await rm(filePath, { force: true });
    console.log(`已删除旧备份：${filePath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
