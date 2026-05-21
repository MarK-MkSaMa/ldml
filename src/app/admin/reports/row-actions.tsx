"use client";

import { useTransition } from "react";
import { resolveReportAction, deleteAction } from "../comments/actions";

export function ReportRowActions({
  reportId,
  commentId,
}: {
  reportId: string;
  commentId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveReportAction(reportId, "rejected");
          })
        }
        className="text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
        title="举报无效，驳回但保留评论"
      >
        驳回
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveReportAction(reportId, "resolved");
          })
        }
        className="text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
        title="举报合理但只标处理，不删评论（适合警告类）"
      >
        标记已处理
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("将删除该评论 + 把这条评论的所有 pending 举报标为 resolved"))
            return;
          startTransition(async () => {
            await deleteAction(commentId);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删评论
      </button>
    </div>
  );
}
