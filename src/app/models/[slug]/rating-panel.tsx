"use client";

/**
 * 评分入口（客户端组件）
 *
 * 页面默认只展示紧凑概览；用户点击后再打开弹窗进行评分，
 * 也可以查看社区评分分布和最近评分列表。
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ModelVoteInsights } from "@/lib/votes";

export type RatingDimension = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  avg: number | null;
  voteCount: number | null;
};

/**
 * 分数刻度参考
 * 主要锚点：1 / 3 / 5 / 7 / 9 / 10
 * 中间档（2 / 4 / 6 / 8）作为相邻档位的过渡
 *
 * 关键词：以"当前同期"为参照系，避免给老模型 10 分后新模型无分可给。
 * 旧评分也会随时间自动衰减权重，鼓励用户隔段时间回来重新评估。
 */
const SCORE_HINTS: Record<number, string> = {
  1: "完全不可用 / 错得离谱",
  2: "勉强能动，远不如同期同类",
  3: "能用，但明显比同期同类差",
  4: "略低于同期平均水平",
  5: "与同期同类相当",
  6: "稍优于同期同类",
  7: "明显优于同期同类",
  8: "同期里很好用，遇到难题再考虑别的",
  9: "同期标杆级表现",
  10: "超越所有同期同类",
};

export function RatingPanel({
  modelId,
  dimensions,
  initialMyVotes,
  totalVotes,
  voteInsights,
  detailsUnlocked,
  canVote,
  notVotableReason,
}: {
  modelId: string;
  dimensions: RatingDimension[];
  initialMyVotes: Record<number, number>;
  totalVotes: number;
  voteInsights: ModelVoteInsights | null;
  detailsUnlocked: boolean;
  canVote: boolean;
  notVotableReason?: string;
}) {
  const router = useRouter();
  const [myVotes, setMyVotes] = useState<Record<number, number>>(initialMyVotes);
  const [pendingDim, setPendingDim] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [, startTransition] = useTransition();

  const votedCount = dimensions.filter((d) => myVotes[d.id] !== undefined).length;
  const hasVotes = votedCount > 0;
  const detailsAvailable = hasVotes && detailsUnlocked && voteInsights !== null;

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
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                你的评分
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {hasVotes ? `已评分 ${votedCount} / ${dimensions.length} 项` : "尚未评分"}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {detailsAvailable
                  ? `社区 ${voteInsights!.voterCount.toLocaleString()} 人 / ${voteInsights!.totalVotes.toLocaleString()} 条评分`
                  : `社区汇总 ${totalVotes.toLocaleString()} 条评分记录`}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {detailsAvailable
                ? "可修改评分，并查看社区均分、分布和最近评分。"
                : "对任一维度评分后，可查看社区均分、分布和最近评分。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRatingOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {hasVotes ? "修改我的评分" : "我要评分"}
            </button>
            <button
              type="button"
              disabled={!detailsAvailable}
              onClick={() => setInsightsOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              {detailsAvailable ? "查看大家的评分" : "评分后可见"}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        title="我的评分"
        description="对你熟悉的维度评 1-10 分；不熟的维度可以跳过。"
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
      >
        <RatingForm
          dimensions={dimensions}
          myVotes={myVotes}
          pendingDim={pendingDim}
          error={error}
          canVote={canVote}
          detailsUnlocked={detailsAvailable}
          notVotableReason={notVotableReason}
          onSubmit={submit}
          onWithdraw={withdraw}
        />
      </Dialog>

      {detailsAvailable && voteInsights && (
        <Dialog
          title="大家的评分"
          description="展示当前有效评分的分数分布和最近评分，不包含撤回记录。"
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
        >
          <VoteInsights dimensions={dimensions} insights={voteInsights} />
        </Dialog>
      )}
    </>
  );
}

function RatingForm({
  dimensions,
  myVotes,
  pendingDim,
  error,
  canVote,
  detailsUnlocked,
  notVotableReason,
  onSubmit,
  onWithdraw,
}: {
  dimensions: RatingDimension[];
  myVotes: Record<number, number>;
  pendingDim: number | null;
  error: string | null;
  canVote: boolean;
  detailsUnlocked: boolean;
  notVotableReason?: string;
  onSubmit: (dimensionId: number, score: number) => void;
  onWithdraw: (dimensionId: number) => void;
}) {
  return (
    <div className="space-y-4">
      {!canVote && notVotableReason && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          {notVotableReason}
        </div>
      )}

      {/* 评分刻度参考（默认折叠） */}
      <ScoreGuide />

      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {dimensions.map((d) => {
        const my = myVotes[d.id];
        const pending = pendingDim === d.id;
        return (
          <div
            key={d.id}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium" title={d.description ?? undefined}>
                  {d.name}
                </div>
                {d.description && (
                  <div className="text-xs text-zinc-500">{d.description}</div>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {detailsUnlocked
                  ? `社区均分 ${d.avg !== null ? d.avg.toFixed(1) : "—"} · ${(d.voteCount ?? 0).toLocaleString()} 票`
                  : "社区均分 · 评分后可见"}
              </div>
            </div>
            <div
              className="grid grid-cols-5 gap-1.5 sm:grid-cols-10"
              role="group"
              aria-label={`${d.name}评分`}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const active = my === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!canVote || pending}
                    onClick={() => onSubmit(d.id, n)}
                    title={`${n} 分 · ${SCORE_HINTS[n]}`}
                    aria-label={`${d.name}：${n} 分，${SCORE_HINTS[n]}`}
                    aria-pressed={active}
                    className={`h-9 min-w-0 rounded-md border text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={!canVote || pending || my === undefined}
                onClick={() => onWithdraw(d.id)}
                aria-label={`撤回${d.name}评分`}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:text-red-400"
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

function VoteInsights({
  dimensions,
  insights,
}: {
  dimensions: RatingDimension[];
  insights: ModelVoteInsights;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">评分用户</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {insights.voterCount.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">有效评分</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {insights.totalVotes.toLocaleString()}
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold">分数分布</h3>
        <div className="space-y-4">
          {dimensions.map((d) => {
            const distribution = insights.distributions[d.id] ?? {};
            const maxCount = Math.max(1, ...Object.values(distribution));
            return (
              <div key={d.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-zinc-500">
                      均分 {d.avg !== null ? d.avg.toFixed(1) : "—"} · {(d.voteCount ?? 0).toLocaleString()} 票
                    </div>
                  </div>
                </div>
                <div
                  className="grid grid-cols-10 gap-1.5"
                  role="img"
                  aria-label={`${d.name}分数分布：${Array.from({ length: 10 }, (_, index) => `${index + 1} 分 ${distribution[index + 1] ?? 0} 票`).join("，")}`}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                    const count = distribution[score] ?? 0;
                    const height = count === 0 ? 8 : Math.max(12, (count / maxCount) * 56);
                    return (
                      <div key={score} className="flex flex-col items-center gap-1" aria-hidden="true">
                        <div className="flex h-14 w-full items-end justify-center rounded bg-zinc-50 px-1 dark:bg-zinc-900">
                          <div
                            className="w-full rounded-t bg-zinc-900 dark:bg-zinc-100"
                            style={{ height }}
                            title={`${score} 分：${count} 票`}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-500 tabular-nums">{score}</div>
                        <div className="text-[10px] text-zinc-400 tabular-nums">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">最近评分</h3>
        {insights.recentVotes.length > 0 ? (
          <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {insights.recentVotes.map((vote) => (
              <div key={vote.id} className="flex items-center gap-3 px-3 py-2">
                <UserAvatar
                  avatarUrl={vote.user.avatarUrl}
                  name={vote.user.displayName ?? vote.user.username}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {vote.user.displayName ?? vote.user.username}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {vote.dimensionName} · {formatDateTime(vote.updatedAt)}
                  </div>
                </div>
                <div className="rounded-md bg-zinc-100 px-2 py-1 text-sm font-semibold tabular-nums dark:bg-zinc-900">
                  {vote.score} 分
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            暂时还没有评分
          </div>
        )}
      </section>
    </div>
  );
}

function UserAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 rounded-full bg-zinc-100 object-cover dark:bg-zinc-900"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Dialog({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-black/45"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 sm:px-5 dark:border-zinc-800">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onCloseRef.current()}
            className="rounded-md px-2 py-1 text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            aria-label="关闭弹窗"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * 评分刻度参考（折叠面板）
 *
 * 默认展开，方便首次访问的用户看到刻度说明。
 * 用户主动操作后用 localStorage 记住偏好；后续访问保持上次状态。
 */
const SCORE_GUIDE_KEY = "score_guide_open";

function ScoreGuide() {
  const [open, setOpen] = useState(true);
  const contentId = useId();

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SCORE_GUIDE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        <span>
          💡 评分参考：
          <span className="text-zinc-500">每个分数都有对应说明，点击或查看下方列表即可了解</span>
        </span>
        <span className="shrink-0 text-xs text-zinc-500">
          {open ? "收起 ▲" : "展开 ▼"}
        </span>
      </button>
      {open && (
        <ul id={contentId} className="border-t border-zinc-200 px-4 py-3 text-xs dark:border-zinc-800">
          {Object.entries(SCORE_HINTS).map(([n, hint]) => (
            <li
              key={n}
              className="flex gap-3 py-0.5"
            >
              <span className="inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-zinc-200 font-mono text-[11px] dark:bg-zinc-800">
                {n}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">{hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "时间未知";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
