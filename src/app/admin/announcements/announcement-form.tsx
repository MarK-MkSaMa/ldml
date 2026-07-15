"use client";

/**
 * 公告新建 / 编辑表单
 * 提交与预览均通过 Server Action，预览复用正式发布的 Markdown 清洗管线。
 */
import Link from "next/link";
import { useState } from "react";
import { previewAnnouncementAction } from "./actions";

type EditorMode = "edit" | "preview";

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
  const [mode, setMode] = useState<EditorMode>("edit");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  const [pending, setPending] = useState(false);

  const TITLE_MAX = 80;
  const CONTENT_MAX = 5000;

  async function openPreview() {
    setMode("preview");
    setPreviewPending(true);
    setPreviewError("");

    try {
      const result = await previewAnnouncementAction(content);
      if (result.ok) {
        setPreviewHtml(result.html);
      } else {
        setPreviewHtml("");
        setPreviewError(result.message);
      }
    } catch {
      setPreviewHtml("");
      setPreviewError("预览生成失败，请稍后重试。");
    } finally {
      setPreviewPending(false);
    }
  }

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="max-w-4xl space-y-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">标题</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          className={inputCls}
          placeholder="例如：新增 Claude Sonnet 4.5 模型"
        />
        <div className="mt-1 text-xs text-zinc-500">
          {title.length} / {TITLE_MAX}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label htmlFor="announcement-content" className="block text-sm font-medium">
              正文（Markdown）
            </label>
            <p className="mt-1 text-xs text-zinc-500">
              预览内容会使用与正式发布相同的安全渲染规则。
            </p>
          </div>
          <div
            className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950"
            aria-label="正文编辑模式"
          >
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={tabClass(mode === "edit")}
              aria-pressed={mode === "edit"}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={openPreview}
              className={tabClass(mode === "preview")}
              aria-pressed={mode === "preview"}
              disabled={previewPending}
            >
              {previewPending ? "生成中…" : "预览"}
            </button>
          </div>
        </div>

        <textarea
          id="announcement-content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={CONTENT_MAX}
          required
          rows={16}
          className={`${inputCls} min-h-80 resize-y font-mono ${mode === "edit" ? "block" : "hidden"}`}
          placeholder="支持粗体 **abc**、斜体 *abc*、链接、代码块、引用、列表"
        />

        {mode === "preview" && (
          <div className="min-h-80 rounded-md border border-zinc-300 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-950">
            {previewPending ? (
              <p className="text-sm text-zinc-500">正在生成预览…</p>
            ) : previewError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>
            ) : previewHtml ? (
              <div
                className="markdown-body min-w-0 break-words [overflow-wrap:anywhere]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-zinc-500">暂无可预览的正文。</p>
            )}
          </div>
        )}

        <div className="mt-1 text-xs text-zinc-500">
          {content.length} / {CONTENT_MAX}
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-semibold">发布设置</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusOption
            name="isActive"
            title="立即上线"
            description="保存后在前台公告列表中显示。"
            checked={isActive}
            onChange={setIsActive}
          />
          <StatusOption
            name="isPinned"
            title="置顶展示"
            description="在排行榜公告横条和公告列表顶部显示。"
            checked={isPinned}
            onChange={setIsPinned}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
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

function StatusOption({
  name,
  title,
  description,
  checked,
  onChange,
}: {
  name: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{description}</span>
      </span>
    </label>
  );
}

function tabClass(active: boolean) {
  return `rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
    active
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
  }`;
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";
