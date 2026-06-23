"use client";

import { useState, useTransition } from "react";
import type { BenchmarkQuestionStatus } from "@/db/schema";
import {
  approveBenchmarkQuestionAction,
  archiveBenchmarkQuestionAction,
  rejectBenchmarkQuestionAction,
} from "./actions";

export function BenchmarkQuestionRowActions({
  id,
  status,
}: {
  id: string;
  status: BenchmarkQuestionStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-2 text-right text-xs">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {status !== "approved" && status !== "archived" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await approveBenchmarkQuestionAction(id);
              });
            }}
            className="text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
          >
            通过
          </button>
        )}
        {status !== "rejected" && status !== "archived" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowReject((v) => !v)}
            className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            拒绝
          </button>
        )}
        {status !== "archived" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("确认归档该题目？归档后前台不再展示。")) return;
              startTransition(async () => {
                await archiveBenchmarkQuestionAction(id);
              });
            }}
            className="text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-300"
          >
            归档
          </button>
        )}
      </div>

      {showReject && (
        <form action={rejectBenchmarkQuestionAction} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="rejectReason"
            placeholder="拒绝原因（可选）"
            className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-red-600 px-2 py-1 text-white hover:bg-red-500"
          >
            确认
          </button>
        </form>
      )}
    </div>
  );
}
