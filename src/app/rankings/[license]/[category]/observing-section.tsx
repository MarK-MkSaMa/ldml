"use client";

/**
 * 观察区区块
 * 客户端组件：支持折叠/展开，每次进页面默认展开（不持久化）
 */
import { useState } from "react";
import type { DimensionInfo, ModelRow } from "@/lib/rankings";
import { RankingTable } from "./ranking-table";

export function ObservingSection({
  dimensions,
  models,
}: {
  dimensions: DimensionInfo[];
  models: ModelRow[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-amber-900 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
      >
        <span>🆕 观察区（{models.length} 个新模型，暂不计入排行）</span>
        <span className="text-xs">{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <RankingTable
            dimensions={dimensions}
            models={models}
            showOverall={true}
            enablePreferences={false}
          />
        </div>
      )}
    </section>
  );
}
