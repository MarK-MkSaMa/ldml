"use client";

/**
 * 模型行的操作按钮组
 * - 状态切换：用 select 一次切到任意状态
 * - 置顶 / 取消置顶
 * - 编辑（链接）
 * - 删除
 */
import { useTransition } from "react";
import Link from "next/link";
import type { ModelStatus } from "@/lib/model-status";
import { setStatusAction, setPinnedAction, deleteModelAction } from "./actions";

const STATUS_OPTIONS: { value: ModelStatus; label: string }[] = [
  { value: "draft", label: "草稿" },
  { value: "observing", label: "观察区" },
  { value: "listed", label: "正式榜" },
  { value: "archived", label: "归档" },
];

export function ModelRowActions({
  id,
  status,
  pinned,
}: {
  id: string;
  status: ModelStatus;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as ModelStatus;
          if (next === status) return;
          startTransition(async () => {
            await setStatusAction(id, next);
          });
        }}
        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            转 {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setPinnedAction(id, !pinned);
          })
        }
        className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
      >
        {pinned ? "取消置顶" : "置顶"}
      </button>
      <Link
        href={`/admin/models/${id}`}
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
              "确认删除此模型？\n\n注意：这会同时删除所有相关的评分、评分历史、评分聚合。不可撤销。",
            )
          )
            return;
          startTransition(async () => {
            await deleteModelAction(id);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
