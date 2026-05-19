/**
 * 全站 loading 兜底
 * 在 page 异步加载期间显示
 */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
          aria-hidden
        />
        <span>加载中…</span>
      </div>
    </div>
  );
}
