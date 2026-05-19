"use client";

/**
 * 全站错误兜底
 *
 * Next.js App Router 约定：error.tsx 必须是客户端组件，
 * 接收 (error, reset) 让用户重试。
 *
 * 注意：error.tsx 处于 layout 之下，不会替换 layout。
 */
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 生产环境再加上报到日志服务
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="text-7xl font-bold tracking-tight text-zinc-300 dark:text-zinc-700">
          500
        </div>
        <h1 className="mt-4 text-xl font-semibold">服务器开小差了</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          页面渲染时出错。可以尝试重试，或返回首页。
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-zinc-400">
            错误 ID：{error.digest}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            重试
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
