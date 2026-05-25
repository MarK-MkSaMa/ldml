"use client";

/**
 * 排行榜客户端外壳
 *
 * 包住"分类 Tab + 引导条 + 内容区"。
 * 点 Tab 时：
 *   1. 立即更新本地 pendingCategory，让 Tab 高亮瞬间反应
 *   2. useTransition 触发路由切换
 *   3. transition 进行中时，把 children 换成 spinner
 *   4. 路由切换完成 → 新 props 进来 → 清空 pending state
 */
import { useEffect, useState, useTransition } from "react";
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

  useEffect(() => {
    setPendingCategory(null);
  }, [category]);

  const displayCategory = pendingCategory ?? category;

  function navigate(nextCategory: string) {
    if (nextCategory === displayCategory) return;
    setPendingCategory(nextCategory);
    startTransition(() => {
      router.push(`/rankings/${nextCategory}`);
    });
  }

  return (
    <>
      {/* 分类 Tab */}
      <nav className="mb-8 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        {categoryTabs.map((tab) => {
          const active = tab.slug === displayCategory;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => navigate(tab.slug)}
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
      </nav>

      {/* 引导条 */}
      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        {hintText}
      </div>

      {/* 内容区：pending 时只换这一块 */}
      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
              aria-hidden
            />
            <span>加载中…</span>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
