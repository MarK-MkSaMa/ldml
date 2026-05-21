/**
 * 排行榜路由的 loading 视图
 *
 * Tab 切换 / 进入页面时立即渲染，避免"点了没反应"。
 * 形态尽量贴近真实页面骨架，避免布局抖动。
 */
export default function RankingsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      {/* 顶部 Tab 占位（视觉占位，不带状态） */}
      <div className="mb-4 flex gap-2">
        <div className="h-8 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mb-8 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="-mb-px h-7 w-14 bg-zinc-200 dark:bg-zinc-800"
            style={{ borderRadius: 2 }}
          />
        ))}
      </div>

      {/* 引导条占位 */}
      <div className="mb-6 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800/40" />

      {/* 表格区 spinner */}
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
            aria-hidden
          />
          <span>加载中…</span>
        </div>
      </div>
    </div>
  );
}
