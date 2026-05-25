/**
 * 编辑模型
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { licenses, categories } from "@/db/schema";
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
  const [m, licenseRows, categoryRows] = await Promise.all([
    getModelByIdForAdmin(id),
    db.select().from(licenses).orderBy(asc(licenses.order)),
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
          licenseId: m.licenseId,
          categoryId: m.categoryId,
          vendor: m.vendor ?? "",
          homepageUrl: m.homepageUrl ?? "",
          releasedAt: m.releasedAt ?? "",
          status: m.status,
          pinned: m.pinned,
        }}
        licenses={licenseRows}
        categories={categoryRows}
        action={boundAction}
        submitLabel="保存修改"
      />
    </div>
  );
}
