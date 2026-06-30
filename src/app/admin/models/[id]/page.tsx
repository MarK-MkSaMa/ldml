/**
 * 编辑模型
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getModelByIdForAdmin } from "@/lib/admin-models";
import { ModelForm } from "../model-form";
import { updateModelAction } from "../actions";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [m, categoryRows] = await Promise.all([
    getModelByIdForAdmin(id),
    db.select().from(categories).orderBy(asc(categories.order)),
  ]);
  if (!m) notFound();

  const boundAction = async (formData: FormData) => {
    "use server";
    await updateModelAction(id, formData);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/models" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回模型列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">编辑模型</h1>
      <ModelForm
        initial={{
          name: m.name,
          slug: m.slug,
          categoryId: m.categoryId,
          lab: m.lab ?? m.vendor ?? "",
          homepageUrl: m.homepageUrl ?? "",
          releasedAt: m.releasedAt ?? "",
          contextTokens: m.contextTokens?.toString() ?? "",
          outputTokens: m.outputTokens?.toString() ?? "",
          inputModalities: m.inputModalities?.join(",") ?? "",
          outputModalities: m.outputModalities?.join(",") ?? "",
          supportsReasoning: m.supportsReasoning,
          supportsToolCall: m.supportsToolCall,
          openWeights:
            m.openWeights === null ? "unknown" : m.openWeights ? "true" : "false",
          priceInput: m.price?.input?.toString() ?? "",
          priceOutput: m.price?.output?.toString() ?? "",
          priceCacheRead: m.price?.cacheRead?.toString() ?? "",
          priceCacheWrite: m.price?.cacheWrite?.toString() ?? "",
          status: m.status,
          pinned: m.pinned,
        }}
        categories={categoryRows}
        action={boundAction}
        submitLabel="保存修改"
      />
    </div>
  );
}
