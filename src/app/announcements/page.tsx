/**
 * 公告列表页 /announcements
 */
import Link from "next/link";
import { listActiveAnnouncements } from "@/lib/announcements";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const items = await listActiveAnnouncements();

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <nav className="mb-4 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            ← 返回首页
          </Link>
        </nav>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">公告</h1>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700">
            暂无公告
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((a) => (
              <li key={a.id} className="min-w-0">
                <Link
                  href={`/announcements/${a.id}`}
                  className="flex h-full min-w-0 flex-col rounded-lg border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <h2
                      className="line-clamp-2 min-w-0 break-words text-base font-medium [overflow-wrap:anywhere]"
                      title={a.title}
                    >
                      {a.isPinned && <span className="mr-1">📌</span>}
                      {a.title}
                    </h2>
                    <span className="shrink-0 pt-0.5 text-xs text-zinc-500">
                      {a.publishedAt
                        ? a.publishedAt.toLocaleDateString("zh-CN")
                        : ""}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 min-w-0 whitespace-pre-line break-words text-sm leading-6 text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
                    {a.content}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
