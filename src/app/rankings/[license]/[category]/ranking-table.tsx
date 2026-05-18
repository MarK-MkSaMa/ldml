"use client";

/**
 * 排行榜表格（客户端组件，处理列头点击排序）
 *
 * 默认按综合分降序。
 * 列头三态排序：默认 → 降序 → 升序 → 回默认
 */
import { useMemo, useState } from "react";
import type { DimensionInfo, ModelRow } from "@/lib/rankings";

type SortKey = "name" | "overall" | "votes" | `dim:${number}`;
type SortOrder = "asc" | "desc";

export function RankingTable({
  dimensions,
  models,
  showOverall,
}: {
  dimensions: DimensionInfo[];
  models: ModelRow[];
  showOverall: boolean;
}) {
  // null 表示默认排序（页面传入的顺序），不为 null 时按指定列排
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder } | null>(null);

  const onHeaderClick = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, order: "desc" };
      if (prev.order === "desc") return { key, order: "asc" };
      return null; // 第三次回到默认
    });
  };

  const sortedModels = useMemo(() => {
    if (!sort) return models;
    const sign = sort.order === "asc" ? 1 : -1;
    return [...models].sort((a, b) => {
      const av = getValue(a, sort.key);
      const bv = getValue(b, sort.key);
      // null / undefined 永远排最后
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * sign;
      }
      return ((av as number) - (bv as number)) * sign;
    });
  }, [models, sort]);

  // 列宽预设
  // 模型列固定，分数 / 综合 / 票数列固定为较窄的数字列
  const dimColWidth = 88; // px，分数列
  const overallColWidth = 88; // px，综合列
  const votesColWidth = 88; // px，票数列
  const nameColWidth = 220; // px，模型列

  // 计算表格最小宽度（防止挤压；超出时父容器会出滚动条）
  const minTableWidth =
    nameColWidth +
    dimensions.length * dimColWidth +
    (showOverall ? overallColWidth : 0) +
    votesColWidth;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full table-fixed border-collapse text-sm"
        style={{ minWidth: `${minTableWidth}px` }}
      >
        <colgroup>
          <col style={{ width: `${nameColWidth}px` }} />
          {dimensions.map((d) => (
            <col key={d.id} style={{ width: `${dimColWidth}px` }} />
          ))}
          {showOverall && <col style={{ width: `${overallColWidth}px` }} />}
          <col style={{ width: `${votesColWidth}px` }} />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
            <Th onClick={() => onHeaderClick("name")} sort={sort} myKey="name" align="left">
              模型
            </Th>
            {dimensions.map((d) => (
              <Th
                key={d.id}
                onClick={() => onHeaderClick(`dim:${d.id}`)}
                sort={sort}
                myKey={`dim:${d.id}`}
                align="right"
                title={d.description ?? undefined}
              >
                {d.name}
              </Th>
            ))}
            {showOverall && (
              <Th
                onClick={() => onHeaderClick("overall")}
                sort={sort}
                myKey="overall"
                align="right"
              >
                综合
              </Th>
            )}
            <Th
              onClick={() => onHeaderClick("votes")}
              sort={sort}
              myKey="votes"
              align="right"
            >
              票数
            </Th>
          </tr>
        </thead>
        <tbody>
          {sortedModels.map((m) => (
            <tr
              key={m.id}
              className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
            >
              <td className="px-3 py-3">
                <div className="truncate font-medium" title={m.name}>
                  {m.name}
                </div>
                {m.vendor && (
                  <div className="truncate text-xs text-zinc-500" title={m.vendor}>
                    {m.vendor}
                  </div>
                )}
              </td>
              {dimensions.map((d) => {
                const s = m.scores[d.id];
                return (
                  <td key={d.id} className="px-3 py-3 text-right tabular-nums">
                    {s?.avg !== null && s?.avg !== undefined ? s.avg.toFixed(1) : "—"}
                  </td>
                );
              })}
              {showOverall && (
                <td className="px-3 py-3 text-right font-semibold tabular-nums">
                  {m.overall !== null ? m.overall.toFixed(1) : "—"}
                </td>
              )}
              <td className="px-3 py-3 text-right text-zinc-500 tabular-nums">
                {m.totalVotes.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  onClick,
  sort,
  myKey,
  align,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sort: { key: SortKey; order: SortOrder } | null;
  myKey: SortKey;
  align: "left" | "right";
  title?: string;
}) {
  const active = sort?.key === myKey;
  const arrow = !active ? "↕" : sort?.order === "desc" ? "↓" : "↑";
  return (
    <th
      onClick={onClick}
      title={title}
      className={`cursor-pointer select-none px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-zinc-900 dark:text-zinc-100" : ""}`}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "flex-row" : "flex-row"
        }`}
      >
        <span>{children}</span>
        <span
          aria-hidden
          className={`inline-block w-3 text-center text-[10px] leading-none ${
            active ? "opacity-100" : "opacity-30"
          }`}
        >
          {arrow}
        </span>
      </span>
    </th>
  );
}

function getValue(row: ModelRow, key: SortKey): string | number | null {
  if (key === "name") return row.name;
  if (key === "overall") return row.overall;
  if (key === "votes") return row.totalVotes;
  if (key.startsWith("dim:")) {
    const dimId = Number(key.slice(4));
    return row.scores[dimId]?.avg ?? null;
  }
  return null;
}
