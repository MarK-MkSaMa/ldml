/**
 * 新建模型
 */
import Link from "next/link";
import { db } from "@/db";
import { licenses, categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ModelForm } from "../model-form";
import { createModelAction } from "../actions";

export default async function NewModelPage() {
  const [licenseRows, categoryRows] = await Promise.all([
    db.select().from(licenses).orderBy(asc(licenses.order)),
    db.select().from(categories).orderBy(asc(categories.order)),
  ]);

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/models" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回模型列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">新建模型</h1>
      <ModelForm
        licenses={licenseRows}
        categories={categoryRows}
        action={createModelAction}
        submitLabel="创建"
      />
    </div>
  );
}
