"use client";

import { useTransition } from "react";
import {
  deleteBenchmarkQuestionAction,
  deleteBenchmarkResultAction,
} from "./actions";

export function DeleteBenchmarkQuestionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("确认删除该基准测试题目？相关测试结果将一并删除，此操作不可撤销。")) return;
        startTransition(async () => {
          await deleteBenchmarkQuestionAction(id);
        });
      }}
      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
    >
      {pending ? "删除中…" : "删除题目"}
    </button>
  );
}

export function DeleteBenchmarkResultButton({ id, modelName }: { id: string; modelName: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`确认删除模型“${modelName}”的测试结果？`)) return;
        startTransition(async () => {
          await deleteBenchmarkResultAction(id);
        });
      }}
      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
