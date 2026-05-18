"use client";

/**
 * 公告新建 / 编辑表单
 * 客户端组件：实时显示字数 + 切换"预览"模式
 *
 * 提交走 Server Action，由父组件传入。
 */
import { useState } from "react";
import Link from "next/link";

export function AnnouncementForm({
  initial,
  action,
  submitLabel = "保存",
}: {
  initial?: {
    title: string;
    content: string;
    isActive: boolean;
    isPinned: boolean;
  };
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);
  const [pending, setPending] = useState(false);

  const TITLE_MAX = 80;
  const CONTENT_MAX = 5000;

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="space-y-6"
    >
      {/* 标题 */}
      <div>
        <label className="mb-1 block text-sm font-medium">标题</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          placeholder="例如：新增 Claude Sonnet 4.5 模型"
        />
        <div className="mt-1 text-xs text-zinc-500">
          {title.length} / {TITLE_MAX}
        </div>
      </div>

      {/* 正文 */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          正文（Markdown）
        </label>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={CONTENT_MAX}
          required
          rows={14}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          placeholder="支持粗体 **abc**、斜体 *abc*、链接、代码块、引用、列表"
        />
        <div className="mt-1 text-xs text-zinc-500">
          {content.length} / {CONTENT_MAX}
        </div>
      </div>

      {/* 选项 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          立即上线
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPinned"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          置顶（在排行榜横条显示）
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "保存中…" : submitLabel}
        </button>
        <Link
          href="/admin/announcements"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
