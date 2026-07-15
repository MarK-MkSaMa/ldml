/**
 * 新建模型
 */
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ModelForm } from "../model-form";
import { createModelAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewModelPage() {
  const categoryRows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.order));
  const defaultCategory = categoryRows[0];
  const defaultOutputModalities = defaultCategory?.slug === "video"
    ? "video"
    : defaultCategory?.slug === "image"
      ? "image"
      : "text";

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/models" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回模型列表
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">添加模型</h1>
      <p className="mb-6 text-sm text-zinc-500">
        手动添加的模型不会绑定 models.dev，同步任务不会覆盖这些记录。
      </p>

      {categoryRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          暂无可用分类，请先在分类管理中创建分类。
        </p>
      ) : (
        <ModelForm
          initial={{
            categoryId: defaultCategory?.id ?? 0,
            status: "observing",
            openWeights: "unknown",
            inputModalities: "text,image",
            outputModalities: defaultOutputModalities,
          }}
          categories={categoryRows}
          action={createModelAction}
          submitLabel="添加模型"
        />
      )}
    </div>
  );
}
