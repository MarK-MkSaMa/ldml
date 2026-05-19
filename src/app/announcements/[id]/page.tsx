/**
 * 公告详情页 /announcements/[id]
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/announcements";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
      <SiteHeader maxWidth="max-w-3xl" />

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

      <SiteFooter />
    </main>
  );
}
