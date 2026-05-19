"use client";

/**
 * 后台错误兜底（保留侧边栏）
 */
import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
      <h1 className="text-base font-semibold text-red-900 dark:text-red-200">
        操作失败
      </h1>
      <p className="mt-2 text-sm text-red-800 dark:text-red-300">
        {error.message || "发生了未知错误"}
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-400">
          错误 ID：{error.digest}
        </p>
      )}
      <div className="mt-5 flex gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          重试
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          返回仪表盘
        </Link>
      </div>
    </div>
  );
}
