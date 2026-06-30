/**
 * 新建生图 / 生视频模型
 */
import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ModelForm } from "../model-form";
import { createModelAction } from "../actions";

export default async function NewModelPage() {
  const categoryRows = await db
    .select()
    .from(categories)
    .where(inArray(categories.slug, ["image", "video"]))
    .orderBy(asc(categories.order));

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/models" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回模型列表
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">添加生图 / 生视频模型</h1>
      <p className="mb-6 text-sm text-zinc-500">
        文字模型由 models.dev 同步维护；这里仅用于手动维护生图和生视频模型。
      </p>

      {categoryRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          未找到生图或生视频分类，请先在分类管理中创建 image / video 分类。
        </p>
      ) : (
        <ModelForm
          initial={{
            categoryId: categoryRows[0]?.id ?? 0,
            status: "observing",
            openWeights: "unknown",
            inputModalities: "text,image",
            outputModalities: categoryRows[0]?.slug === "video" ? "video" : "image",
          }}
          categories={categoryRows}
          action={createModelAction}
          submitLabel="添加模型"
        />
      )}
    </div>
  );
}
