"use client";

/**
 * "检查观察区"按钮
 *
 * 触发晋升扫描，结果用悬浮 toast 提示，不占用页面布局空间。
 */
import { useEffect, useState, useTransition } from "react";
import { promoteEligibleAction } from "./actions";

export function PromoteButton() {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "info" | "err"; text: string } | null>(
    null,
  );

  // 3 秒后自动消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function run() {
    startTransition(async () => {
      try {
        const r = await promoteEligibleAction();
        if (r.promoted > 0) {
          setToast({
            kind: "ok",
            text: `${r.promoted} 个模型已晋升正式榜（共检查 ${r.checked} 个）`,
          });
        } else {
          setToast({
            kind: "info",
            text: `检查了 ${r.checked} 个观察区模型，暂无可晋升的`,
          });
        }
      } catch (e) {
        setToast({
          kind: "err",
          text: e instanceof Error ? e.message : "操作失败",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="按规则（发布 ≥ 7 天 或 任一维度 ≥ 50 票）把符合条件的观察区模型转为正式榜"
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? "检查中…" : "检查观察区"}
      </button>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/80 dark:text-green-200"
              : toast.kind === "err"
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200"
                : "border-zinc-300 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
