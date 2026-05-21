"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteCategoryAction } from "./actions";

export function CategoryRowActions({
  id,
  name,
  modelCount,
  dimensionCount,
}: {
  id: number;
  name: string;
  modelCount: number;
  dimensionCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      <Link
        href={`/admin/categories/${id}`}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        编辑
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const lines = [`确认删除分类"${name}"？`];
          if (dimensionCount > 0) lines.push(`将级联删除 ${dimensionCount} 个维度`);
          if (modelCount > 0) lines.push(`将级联删除 ${modelCount} 个模型及其所有评分 / 评论`);
          lines.push("此操作不可撤销！");
          if (!confirm(lines.join("\n\n"))) return;
          startTransition(async () => {
            await deleteCategoryAction(id);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
