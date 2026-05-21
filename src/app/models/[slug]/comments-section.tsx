"use client";

/**
 * 模型详情页的评论区（客户端组件）
 *
 * 本步骤实现：
 *   - 渲染评论树（顶级 + 二级回复）
 *   - 发表新评论 / 回复某条
 *   - 排序切换（hot / latest）
 *   - 隐藏 / 删除占位展示
 *
 * 暂未实现（下一步）：点赞 / 点踩 / 编辑 / 删除 / 举报
 */
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CommentNode, CommentSort } from "@/lib/comments";

type ViewerState = {
  isLoggedIn: boolean;
  userId?: string;
  isAdmin: boolean;
  canComment: boolean;
  notCommentableReason?: string;
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function CommentsSection({
  modelId,
  initialComments,
  initialSort,
  viewer,
}: {
  modelId: string;
  initialComments: CommentNode[];
  initialSort: CommentSort;
  viewer: ViewerState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 用户点的"乐观"排序值。路由完成后会被 props.initialSort 覆盖（通过 useEffect 清空）
  const [pendingSort, setPendingSort] = useState<CommentSort | null>(null);

  // initialSort 变化（路由切完）就清掉 pendingSort
  useEffect(() => {
    setPendingSort(null);
  }, [initialSort]);

  const sort = pendingSort ?? initialSort;
  const comments = initialComments;

  // 切排序：用 URL 参数让服务端重新查（保留 SSR 优势，URL 也可分享）
  function changeSort(next: CommentSort) {
    if (next === sort) return;
    setPendingSort(next);
    const params = new URLSearchParams(searchParams);
    if (next === "hot") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // 发完新评论 / 回复 / 反应 / 删除：让服务端重查
  function reloadFromServer() {
    startTransition(() => router.refresh());
  }

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          评论 <span className="text-zinc-500">({totalCount})</span>
        </h2>
        <div className="flex gap-1 text-xs">
          {(["hot", "latest"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeSort(s)}
              className={`rounded-md px-2 py-1 transition-colors ${
                s === sort
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {s === "hot" ? "热度" : "最新"}
            </button>
          ))}
        </div>
      </div>

      {/* 发表表单 */}
      {viewer.canComment ? (
        <CommentForm modelId={modelId} onPosted={reloadFromServer} />
      ) : (
        <div className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          {viewer.notCommentableReason ?? "登录后即可发表评论"}
        </div>
      )}

      {/* 列表 */}
      {pendingSort !== null && isPending ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
              aria-hidden
            />
            <span>加载中…</span>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有评论，来抢沙发
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                modelId={modelId}
                viewer={viewer}
                onChanged={reloadFromServer}
                isReply={false}
              />
              {c.replies && c.replies.length > 0 && (
                <ul className="mt-3 ml-10 space-y-3 border-l-2 border-zinc-100 pl-4 dark:border-zinc-800">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem
                        comment={r}
                        modelId={modelId}
                        viewer={viewer}
                        onChanged={reloadFromServer}
                        isReply={true}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// 单条评论
// ============================================================

function CommentItem({
  comment: c,
  modelId,
  viewer,
  onChanged,
  isReply,
}: {
  comment: CommentNode;
  modelId: string;
  viewer: ViewerState;
  onChanged: () => void;
  isReply: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // 乐观反应状态
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(
    c.myReaction,
  );
  const [likeCount, setLikeCount] = useState(c.likeCount);
  const [dislikeCount, setDislikeCount] = useState(c.dislikeCount);
  const [reacting, setReacting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // c 的 prop 更新时同步乐观状态（refresh 后）
  useEffect(() => {
    setMyReaction(c.myReaction);
    setLikeCount(c.likeCount);
    setDislikeCount(c.dislikeCount);
  }, [c.myReaction, c.likeCount, c.dislikeCount]);

  // 隐藏 / 删除占位
  if (c.isDeleted) {
    return <div className="text-sm italic text-zinc-400">[该评论已被删除]</div>;
  }
  if (c.isHidden) {
    return <div className="text-sm italic text-zinc-400">[该评论已被隐藏]</div>;
  }

  const isAuthor = viewer.userId === c.author.id;
  const withinEditWindow =
    isAuthor && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS;
  const canDelete = isAuthor || viewer.isAdmin;
  const canReport = viewer.isLoggedIn && !isAuthor;

  async function toggleReaction(next: "like" | "dislike") {
    if (!viewer.canComment || reacting) return;
    setActionError(null);
    setReacting(true);
    // 乐观更新
    const prevReaction = myReaction;
    const prevLike = likeCount;
    const prevDislike = dislikeCount;
    let target: "like" | "dislike" | null = next;
    if (myReaction === next) target = null; // 同样的点击 → 取消

    if (target === null) {
      if (prevReaction === "like") setLikeCount((n) => n - 1);
      else if (prevReaction === "dislike") setDislikeCount((n) => n - 1);
    } else if (target === "like") {
      setLikeCount((n) => (prevReaction === "like" ? n : n + 1));
      if (prevReaction === "dislike") setDislikeCount((n) => n - 1);
    } else {
      setDislikeCount((n) => (prevReaction === "dislike" ? n : n + 1));
      if (prevReaction === "like") setLikeCount((n) => n - 1);
    }
    setMyReaction(target);

    try {
      const res = await fetch(`/api/comments/${c.id}/reaction`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reaction: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      // 回滚
      setMyReaction(prevReaction);
      setLikeCount(prevLike);
      setDislikeCount(prevDislike);
      setActionError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setReacting(false);
    }
  }

  async function doDelete() {
    if (!confirm("确认删除此评论？此操作不可撤销")) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* 头像 */}
        {c.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.author.avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        )}

        <div className="min-w-0 flex-1">
          {/* 作者行 */}
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{c.author.username}</span>
            {c.author.isAdmin && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                管理员
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {formatTime(c.createdAt)}
              {c.editedAt && <span> · 已编辑</span>}
            </span>
          </div>

          {/* 内容 / 编辑表单 */}
          {editOpen ? (
            <div className="mt-2">
              <EditForm
                commentId={c.id}
                initialContent={c.content}
                onSaved={() => {
                  setEditOpen(false);
                  onChanged();
                }}
                onCancel={() => setEditOpen(false)}
              />
            </div>
          ) : (
            <div
              className="markdown-body mt-1 text-sm"
              dangerouslySetInnerHTML={{ __html: c.contentHtml }}
            />
          )}

          {/* 操作行 */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <button
              type="button"
              disabled={!viewer.canComment || reacting}
              onClick={() => toggleReaction("like")}
              title={viewer.canComment ? "点赞" : "登录并满足等级后可点赞"}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                myReaction === "like"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>👍</span>
              <span className="tabular-nums">{likeCount}</span>
            </button>
            <button
              type="button"
              disabled={!viewer.canComment || reacting}
              onClick={() => toggleReaction("dislike")}
              title={viewer.canComment ? "点踩" : "登录并满足等级后可点踩"}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                myReaction === "dislike"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>👎</span>
              <span className="tabular-nums">{dislikeCount}</span>
            </button>

            {!isReply && viewer.canComment && (
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {replyOpen ? "取消回复" : "回复"}
              </button>
            )}

            {withinEditWindow && !editOpen && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                编辑
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={doDelete}
                className="hover:text-red-600 dark:hover:text-red-400"
              >
                删除
              </button>
            )}

            {canReport && (
              <button
                type="button"
                onClick={() => setReportOpen((v) => !v)}
                className="hover:text-amber-700 dark:hover:text-amber-400"
              >
                举报
              </button>
            )}
          </div>

          {actionError && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              {actionError}
            </div>
          )}

          {/* 回复表单 */}
          {replyOpen && !isReply && viewer.canComment && (
            <div className="mt-3">
              <CommentForm
                modelId={modelId}
                parentId={c.id}
                placeholder={`回复 @${c.author.username}…`}
                compact
                onPosted={() => {
                  setReplyOpen(false);
                  onChanged();
                }}
                onCancel={() => setReplyOpen(false)}
              />
            </div>
          )}

          {/* 举报面板 */}
          {reportOpen && (
            <div className="mt-3">
              <ReportPanel
                commentId={c.id}
                onSubmitted={() => {
                  setReportOpen(false);
                  setActionError(null);
                }}
                onCancel={() => setReportOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 编辑表单（行内）
// ============================================================

function EditForm({
  commentId,
  initialContent,
  onSaved,
  onCancel,
}: {
  commentId: string;
  initialContent: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX = 3000;

  async function submit() {
    if (content.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX}
        rows={3}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {content.length} / {MAX}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || content.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 举报面板
// ============================================================

const REPORT_REASONS = [
  { value: "spam", label: "垃圾广告" },
  { value: "abuse", label: "辱骂 / 人身攻击" },
  { value: "off_topic", label: "与主题无关" },
  { value: "other", label: "其他" },
] as const;

function ReportPanel({
  commentId,
  onSubmitted,
  onCancel,
}: {
  commentId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]["value"]>(
    "spam",
  );
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, detail: detail || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setDone(true);
      // 短暂展示"已举报"再收起
      setTimeout(onSubmitted, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "举报失败");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
        ✓ 已举报，感谢反馈
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        举报原因
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className={`cursor-pointer rounded px-2 py-1 text-xs ${
              reason === r.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="hidden"
            />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="补充说明（可选，≤ 500 字）"
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <div className="mt-2 flex items-center justify-between">
        {error ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : (
          <span className="text-xs text-zinc-500">
            举报会进入审核队列；同一评论你只能举报一次
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {pending ? "提交中…" : "提交举报"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 发表表单（新评论 / 回复共用）
// ============================================================

function CommentForm({
  modelId,
  parentId,
  placeholder,
  compact,
  onPosted,
  onCancel,
}: {
  modelId: string;
  parentId?: string;
  placeholder?: string;
  compact?: boolean;
  onPosted: () => void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (content.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelId, parentId: parentId ?? null, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setContent("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发表失败");
    } finally {
      setPending(false);
    }
  }

  const MAX = 3000;

  return (
    <div className={compact ? "" : "mb-6"}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX}
        rows={compact ? 3 : 4}
        placeholder={placeholder ?? "支持 Markdown · 友善讨论"}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {content.length} / {MAX}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {error}
            </span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              取消
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || content.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {pending ? "发表中…" : parentId ? "回复" : "发表"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 工具
// ============================================================

function formatTime(d: Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = Date.now();
  const diff = now - date.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return date.toLocaleDateString("zh-CN");
}
