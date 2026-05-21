"use client";

/**
 * 关键字添加表单
 *
 * 含"预览"模式：输入一段测试文本，实时显示是否命中
 */
import { useMemo, useState, useTransition } from "react";
import { createKeywordAction } from "./actions";

export function KeywordForm() {
  const [pattern, setPattern] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [action, setAction] = useState<"block" | "hide">("block");
  const [preview, setPreview] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 预览结果（纯前端计算）
  const previewResult = useMemo(() => {
    if (!pattern || !preview) return null;
    try {
      if (isRegex) {
        return new RegExp(pattern, "i").test(preview);
      }
      return preview.toLowerCase().includes(pattern.toLowerCase());
    } catch {
      return null; // 非法正则
    }
  }, [pattern, preview, isRegex]);

  const regexInvalid = useMemo(() => {
    if (!isRegex || !pattern) return false;
    try {
      new RegExp(pattern);
      return false;
    } catch {
      return true;
    }
  }, [pattern, isRegex]);

  function submit() {
    if (!pattern.trim() || regexInvalid) return;
    setError(null);
    const fd = new FormData();
    fd.set("pattern", pattern.trim());
    if (isRegex) fd.set("isRegex", "on");
    fd.set("action", action);
    startTransition(async () => {
      try {
        await createKeywordAction(fd);
        setPattern("");
        setPreview("");
        setIsRegex(false);
        setAction("block");
      } catch (e) {
        setError(e instanceof Error ? e.message : "添加失败");
      }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            关键字 / 正则
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            maxLength={200}
            placeholder={isRegex ? "例：^\\d{11}$" : "例：垃圾广告"}
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none ${
              regexInvalid
                ? "border-red-400 focus:border-red-500"
                : "border-zinc-300 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
            } bg-white dark:bg-zinc-900`}
          />
          {regexInvalid && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              非法的正则表达式
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            使用正则匹配
          </label>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="action"
                checked={action === "block"}
                onChange={() => setAction("block")}
              />
              拒绝写入
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="action"
                checked={action === "hide"}
                onChange={() => setAction("hide")}
              />
              写入即隐藏
            </label>
          </div>
        </div>
      </div>

      {/* 预览 */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          预览（输入一段测试文本，立刻看是否命中）
        </label>
        <input
          type="text"
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          placeholder="测试这段评论会不会被这条规则拦下…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
        {pattern && preview && (
          <div className="mt-2 text-xs">
            {previewResult === true ? (
              <span className="text-red-600 dark:text-red-400">⚠ 命中 — 该评论会被{action === "block" ? "拒绝" : "隐藏"}</span>
            ) : previewResult === false ? (
              <span className="text-green-700 dark:text-green-400">✓ 未命中 — 该评论正常通过</span>
            ) : (
              <span className="text-zinc-500">无法判断（正则非法？）</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {error ? (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        ) : (
          <span className="text-xs text-zinc-500">
            添加后立即生效；现有评论不会被回溯
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !pattern.trim() || regexInvalid}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "添加中…" : "添加规则"}
        </button>
      </div>
    </div>
  );
}
