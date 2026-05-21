"use client";

import { useTransition } from "react";
import { deleteKeywordAction } from "./actions";

export function KeywordRowActions({
  id,
  pattern,
}: {
  id: number;
  pattern: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`确认删除规则"${pattern}"？`)) return;
          startTransition(async () => {
            await deleteKeywordAction(id);
          });
        }}
        className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        删除
      </button>
    </div>
  );
}
