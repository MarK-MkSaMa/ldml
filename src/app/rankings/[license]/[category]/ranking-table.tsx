"use client";

/**
 * 排行榜表格（客户端组件，处理列头点击排序）
 *
 * 默认按综合分降序。
 * 列头三态排序：默认 → 降序 → 升序 → 回默认
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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

  // 给移动端的排序选项列表（不含 name，因为按名字排在卡片视图意义不大）
  const sortOptions: { key: SortKey; label: string }[] = [
    ...(showOverall ? [{ key: "overall" as SortKey, label: "综合分" }] : []),
    { key: "votes", label: "票数" },
    ...dimensions.map((d) => ({
      key: `dim:${d.id}` as SortKey,
      label: d.name,
    })),
  ];

  return (
    <>
      {/* 移动端：排序条 + 卡片列表 */}
      <div className="md:hidden">
        <MobileSortBar
          options={sortOptions}
          sort={sort}
          onChange={setSort}
        />
        <ul className="space-y-3">
          {sortedModels.map((m) => (
            <MobileCard
              key={m.id}
              model={m}
              dimensions={dimensions}
              showOverall={showOverall}
              onOpen={() => router.push(`/models/${m.slug}`)}
              onPrefetch={() => router.prefetch(`/models/${m.slug}`)}
            />
          ))}
        </ul>
      </div>

      {/* 桌面：表格 */}
      <div className="hidden overflow-x-auto md:block">
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
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/models/${m.slug}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/models/${m.slug}`);
                }
              }}
              onMouseEnter={() => router.prefetch(`/models/${m.slug}`)}
              className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:border-zinc-900 dark:hover:bg-zinc-900/40 dark:focus:bg-zinc-900/40"
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
    </>
  );
}

/**
 * 移动端排序条：当前排序键 + 升降序切换
 */
function MobileSortBar({
  options,
  sort,
  onChange,
}: {
  options: { key: SortKey; label: string }[];
  sort: { key: SortKey; order: SortOrder } | null;
  onChange: (s: { key: SortKey; order: SortOrder } | null) => void;
}) {
  const currentKey = sort?.key ?? "overall";
  const currentOrder = sort?.order ?? "desc";

  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500">按</span>
      <select
        value={currentKey}
        onChange={(e) => {
          const key = e.target.value as SortKey;
          onChange({ key, order: currentOrder });
        }}
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onChange({
            key: currentKey,
            order: currentOrder === "desc" ? "asc" : "desc",
          })
        }
        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title={currentOrder === "desc" ? "降序" : "升序"}
      >
        {currentOrder === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
}

/**
 * 移动端单张模型卡
 */
function MobileCard({
  model: m,
  dimensions,
  showOverall,
  onOpen,
  onPrefetch,
}: {
  model: ModelRow;
  dimensions: DimensionInfo[];
  showOverall: boolean;
  onOpen: () => void;
  onPrefetch: () => void;
}) {
  return (
    <li
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onTouchStart={onPrefetch}
      className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 transition-colors focus:bg-zinc-50 focus:outline-none active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-800 dark:active:bg-zinc-800"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium" title={m.name}>
            {m.name}
          </div>
          {m.vendor && (
            <div className="truncate text-xs text-zinc-500">{m.vendor}</div>
          )}
        </div>
        {showOverall && m.overall !== null && (
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold tabular-nums">
              {m.overall.toFixed(1)}
            </div>
            <div className="text-[10px] uppercase text-zinc-500">综合</div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {dimensions.map((d) => {
          const s = m.scores[d.id];
          const avg = s?.avg ?? null;
          // 进度条宽度：分数 1-10 映射到 0-100%
          const pct = avg === null ? 0 : Math.max(0, Math.min(100, (avg / 10) * 100));
          return (
            <div key={d.id} className="text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span className="truncate" title={d.description ?? undefined}>
                  {d.name}
                </span>
                <span className="ml-2 shrink-0 tabular-nums text-zinc-900 dark:text-zinc-100">
                  {avg !== null ? avg.toFixed(1) : "—"}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-right text-xs text-zinc-500 tabular-nums">
        {m.totalVotes.toLocaleString()} 票
      </div>
    </li>
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
