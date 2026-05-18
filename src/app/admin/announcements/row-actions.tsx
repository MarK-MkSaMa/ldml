"use client";

/**
 * 单行的操作按钮（上下线 / 置顶 / 删除）
 * 客户端组件 —— 因为删除需要 confirm 弹窗
 */
import { useTransition } from "react";
import Link from "next/link";
import {
  toggleActiveAction,
  togglePinnedAction,
  deleteAnnouncementAction,
} from "./actions";

export function AnnouncementRowActions({
  id,
  isActive,
  isPinned,
}: {
  id: string;
  isActive: boolean;
  isPinned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await togglePinnedAction(id, !isPinned);
          })
        }
        className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
      >
        {isPinned ? "取消置顶" : "置顶"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleActiveAction(id, !isActive);
          })
        }
        className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
      >
        {isActive ? "下线" : "上线"}
      </button>
      <Link
        href={`/admin/announcements/${id}`}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        编辑
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("确认删除此公告？不可撤销")) return;
          startTransition(async () => {
            await deleteAnnouncementAction(id);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
