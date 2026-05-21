"use client";

import { useTransition } from "react";
import { unhideAction, hideAction, deleteAction } from "./actions";

export function CommentReviewActions({
  commentId,
  isHidden,
  isDeleted,
}: {
  commentId: string;
  isHidden: boolean;
  isDeleted: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (isDeleted) {
    return <span className="text-zinc-500">已删除，无可操作</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {isHidden ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await unhideAction(commentId);
            })
          }
          className="text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
        >
          放行
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await hideAction(commentId);
            })
          }
          className="text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
        >
          隐藏
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("确认删除此评论？同时会将该评论的所有 pending 举报标为 resolved。"))
            return;
          startTransition(async () => {
            await deleteAction(commentId);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
