import Link from "next/link";
import { listCategoriesForAdmin } from "@/lib/admin-dimensions";
import { DimensionForm } from "../dimension-form";
import { createDimensionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDimensionPage() {
  const cats = await listCategoriesForAdmin();
  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link
          href="/admin/dimensions"
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← 返回维度列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">新建维度</h1>
      <DimensionForm
        categories={cats}
        action={createDimensionAction}
        submitLabel="创建"
      />
    </div>
  );
}
