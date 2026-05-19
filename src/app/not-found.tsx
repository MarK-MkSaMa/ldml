/**
 * 全站 404 页
 * 当任何路由不匹配，或代码调用 notFound() 时显示
 */
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-6xl" />
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <div className="text-7xl font-bold tracking-tight text-zinc-300 dark:text-zinc-700">
            404
          </div>
          <h1 className="mt-4 text-xl font-semibold">页面不存在</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            你访问的页面已被删除、归档，或链接有误。
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              返回首页
            </Link>
            <Link
              href="/announcements"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              查看公告
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
