"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteDimensionAction } from "./actions";

export function DimensionRowActions({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      <Link
        href={`/admin/dimensions/${id}`}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        编辑
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `确认删除维度"${name}"？\n\n所有用户对该维度的投票、评分历史、统计聚合都会被删除。\n此操作不可撤销。`,
            )
          )
            return;
          startTransition(async () => {
            await deleteDimensionAction(id);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
