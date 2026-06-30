"use client";

import { useEffect, useState, useTransition } from "react";
import { syncModelsDevAction } from "./actions";

export function ModelsDevSyncButton() {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function run() {
    startTransition(async () => {
      try {
        const r = await syncModelsDevAction();
        setToast({
          kind: "ok",
          text: `models.dev 同步完成：新增 ${r.created}，更新 ${r.updated}，归档 ${r.archived}，跳过 ${r.skipped}`,
        });
      } catch (e) {
        setToast({ kind: "err", text: e instanceof Error ? e.message : "同步失败" });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? "同步中…" : "同步 models.dev"}
      </button>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/80 dark:text-green-200"
              : "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
