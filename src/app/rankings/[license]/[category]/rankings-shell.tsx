"use client";

/**
 * 排行榜客户端外壳
 *
 * 包住"分类 Tab + 引导条 + 内容区"。
 * 点 Tab 时：
 *   1. 立即更新本地 pendingCategory，让 Tab 高亮瞬间反应
 *   2. 预取其它分类路由，减少首次切换等待
 *   3. useTransition 触发路由切换
 *   4. transition 超过短暂阈值时才显示 loading，避免快速切换闪烁
 */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type CategoryTab = { slug: string; name: string };

export function RankingsShell({
  category,
  hintText,
  categoryTabs,
  children,
}: {
  category: string;
  hintText: string;
  categoryTabs: CategoryTab[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    for (const tab of categoryTabs) {
      if (tab.slug !== category) {
        router.prefetch(`/rankings/${tab.slug}`);
      }
    }
  }, [category, categoryTabs, router]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setShowLoading(isPending),
      isPending ? 200 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [isPending]);

  const displayCategory =
    pendingCategory && pendingCategory !== category ? pendingCategory : category;

  function prefetchCategory(nextCategory: string) {
    if (nextCategory !== category) {
      router.prefetch(`/rankings/${nextCategory}`);
    }
  }

  function navigate(nextCategory: string) {
    if (nextCategory === displayCategory) return;
    prefetchCategory(nextCategory);
    setPendingCategory(nextCategory);
    startTransition(() => {
      router.push(`/rankings/${nextCategory}`);
    });
  }

  return (
    <>
      {/* 分类 Tab */}
      <nav className="mb-8 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
        {categoryTabs.map((tab) => {
          const active = tab.slug === displayCategory;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => navigate(tab.slug)}
              onFocus={() => prefetchCategory(tab.slug)}
              onMouseEnter={() => prefetchCategory(tab.slug)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                active
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
        <Link
          href={`/model-requests/new?category=${encodeURIComponent(displayCategory)}`}
          className="ml-auto mb-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          申请添加新模型
        </Link>
      </nav>

      {/* 引导条 */}
      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        {hintText}
      </div>

      {/* 内容区：pending 时保留旧内容高度；慢请求才显示 loading，避免快速切换闪烁 */}
      <div className="relative">
        <div className={showLoading ? "pointer-events-none opacity-50" : undefined}>
          {children}
        </div>
        {showLoading && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-center py-20">
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-sm text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
                aria-hidden
              />
              <span>加载中…</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
