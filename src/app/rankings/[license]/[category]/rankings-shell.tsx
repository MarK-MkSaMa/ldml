"use client";

/**
 * 排行榜客户端外壳
 *
 * 包住"双层 Tab + 引导条 + 内容区"。
 * 点 Tab 时：
 *   1. 立即更新本地 pendingLicense/pendingCategory，让 Tab 高亮瞬间反应
 *   2. useTransition 触发路由切换（startTransition 内部）
 *   3. transition 进行中 (isPending) 时，把 children（服务端渲染的内容）换成 spinner
 *   4. 路由切换完成 → 新 props 进来 → useEffect 清空 pending state → 新 children 替换 spinner
 *
 * 这样上层 Header / Banner / Tabs / 引导条 全程保持，只有内容区有 loading 反馈。
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const LICENSE_TABS = [
  { slug: "closed-source", name: "非开源" },
  { slug: "open-source", name: "开源" },
];
const CATEGORY_TABS = [
  { slug: "text", name: "文字" },
  { slug: "image", name: "生图" },
  { slug: "video", name: "生视频" },
];

export function RankingsShell({
  license,
  category,
  hintText,
  children,
}: {
  license: string;
  category: string;
  hintText: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 用户点击后的"乐观"选择，在路由实际完成前就用这个高亮 Tab
  const [pending, setPending] = useState<{
    license: string | null;
    category: string | null;
  }>({ license: null, category: null });

  // 路由切换完成后，props 会更新，清掉 pending 让显示回到 props
  useEffect(() => {
    setPending({ license: null, category: null });
  }, [license, category]);

  const displayLicense = pending.license ?? license;
  const displayCategory = pending.category ?? category;

  function navigate(nextLicense: string, nextCategory: string) {
    if (nextLicense === displayLicense && nextCategory === displayCategory) return;
    setPending({ license: nextLicense, category: nextCategory });
    startTransition(() => {
      router.push(`/rankings/${nextLicense}/${nextCategory}`);
    });
  }

  return (
    <>
      {/* 大类 Tab */}
      <nav className="mb-4 flex gap-2">
        {LICENSE_TABS.map((tab) => {
          const active = tab.slug === displayLicense;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => navigate(tab.slug, displayCategory)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </nav>

      {/* 分类 Tab */}
      <nav className="mb-8 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        {CATEGORY_TABS.map((tab) => {
          const active = tab.slug === displayCategory;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => navigate(displayLicense, tab.slug)}
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
