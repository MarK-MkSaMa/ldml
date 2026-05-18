"use client";

/**
 * 评分面板（客户端组件）
 *
 * 每个维度一行：维度名 + 1-10 按钮组 + 撤回按钮
 * 点击按钮立即 POST，乐观更新本地状态。
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type RatingDimension = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export function RatingPanel({
  modelId,
  dimensions,
  initialMyVotes,
  canVote,
  notVotableReason,
}: {
  modelId: string;
  dimensions: RatingDimension[];
  initialMyVotes: Record<number, number>;
  canVote: boolean;
  notVotableReason?: string;
}) {
  const router = useRouter();
  const [myVotes, setMyVotes] = useState<Record<number, number>>(initialMyVotes);
  const [pendingDim, setPendingDim] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(dimensionId: number, score: number) {
    if (!canVote) return;
    setError(null);
    setPendingDim(dimensionId);
    // 乐观更新
    const prev = myVotes[dimensionId];
    setMyVotes((v) => ({ ...v, [dimensionId]: score }));
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelId, dimensionId, score }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      // 刷新服务端数据（更新模型详情页的统计数字）
      startTransition(() => router.refresh());
    } catch (e) {
      // 回滚
      setMyVotes((v) => {
        const next = { ...v };
        if (prev === undefined) delete next[dimensionId];
        else next[dimensionId] = prev;
        return next;
      });
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setPendingDim(null);
    }
  }

  async function withdraw(dimensionId: number) {
    if (!canVote) return;
    const prev = myVotes[dimensionId];
    if (prev === undefined) return;
    setError(null);
    setPendingDim(dimensionId);
    setMyVotes((v) => {
      const next = { ...v };
      delete next[dimensionId];
      return next;
    });
    try {
      const res = await fetch(`/api/votes/${modelId}/${dimensionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setMyVotes((v) => ({ ...v, [dimensionId]: prev }));
      setError(e instanceof Error ? e.message : "撤回失败");
    } finally {
      setPendingDim(null);
    }
  }

  return (
    <div className="space-y-4">
      {!canVote && notVotableReason && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          {notVotableReason}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {dimensions.map((d) => {
        const my = myVotes[d.id];
        const pending = pendingDim === d.id;
        return (
          <div
            key={d.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-32">
              <div className="text-sm font-medium" title={d.description ?? undefined}>
                {d.name}
              </div>
              {d.description && (
                <div className="text-xs text-zinc-500">{d.description}</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const active = my === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!canVote || pending}
                    onClick={() => submit(d.id, n)}
                    className={`h-8 w-8 rounded-md border text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={!canVote || pending || my === undefined}
                onClick={() => withdraw(d.id)}
                className="ml-2 rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-red-400"
              >
                撤回
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
