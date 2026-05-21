/**
 * 关键字黑名单管理服务
 */
import { db } from "@/db";
import { bannedKeywords } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export type BannedKeyword = typeof bannedKeywords.$inferSelect;

const PATTERN_MAX = 200;

export type KeywordInput = {
  pattern: string;
  isRegex: boolean;
  action: "block" | "hide";
};

function validate(input: KeywordInput): void {
  if (!input.pattern?.trim()) throw new Error("关键字不能为空");
  if (input.pattern.length > PATTERN_MAX)
    throw new Error(`关键字超过 ${PATTERN_MAX} 字符`);
  if (input.isRegex) {
    try {
      new RegExp(input.pattern);
    } catch (e) {
      throw new Error(
        "非法的正则表达式: " +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  }
  if (input.action !== "block" && input.action !== "hide") {
    throw new Error("非法的 action");
  }
}

export async function listKeywords(): Promise<BannedKeyword[]> {
  return db.select().from(bannedKeywords).orderBy(desc(bannedKeywords.createdAt));
}

export async function createKeyword(
  createdBy: string,
  input: KeywordInput,
): Promise<BannedKeyword> {
  validate(input);
  const [row] = await db
    .insert(bannedKeywords)
    .values({
      pattern: input.pattern.trim(),
      isRegex: input.isRegex,
      action: input.action,
      createdBy,
    })
    .returning();
  return row;
}

export async function deleteKeyword(id: number): Promise<boolean> {
  const rows = await db
    .delete(bannedKeywords)
    .where(eq(bannedKeywords.id, id))
    .returning({ id: bannedKeywords.id });
  return rows.length > 0;
}
