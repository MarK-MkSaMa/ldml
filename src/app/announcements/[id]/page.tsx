/**
 * 公告详情页 /announcements/[id]
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/announcements";
import { SessionMenu } from "@/components/session-menu";

export const dynamic = "force-dynamic";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAnnouncementById(id);
  // 非 active 的公告对普通用户不可见
  if (!a || !a.isActive) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            LDML 大模型排行榜
          </Link>
          <SessionMenu />
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <nav className="mb-4 text-sm text-zinc-500">
          <Link
            href="/announcements"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← 全部公告
          </Link>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight">
          {a.isPinned && <span className="mr-2">📌</span>}
          {a.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {a.publishedAt
            ? `发布于 ${a.publishedAt.toLocaleString("zh-CN", { hour12: false })}`
            : ""}
        </p>

        <div
          className="markdown-body mt-8"
          // 内容已经在写入时 sanitize 过，可以安全渲染
          dangerouslySetInnerHTML={{ __html: a.contentHtml }}
        />
      </article>

      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
        🚧 站点建设中
      </footer>
    </main>
  );
}
