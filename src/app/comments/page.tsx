import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCommentFeed, type CommentSort } from "@/lib/comments";

export const dynamic = "force-dynamic";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const sort: CommentSort = sp.sort === "hot" ? "hot" : "latest";
  const comments = await listCommentFeed({ sort, limit: 50 });

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <MessageSquare className="h-5 w-5" aria-hidden />
              <span className="text-sm">全站评论</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">评论</h1>
            <p className="mt-2 text-sm text-zinc-500">
              看看大家最近在讨论哪些模型，以及他们在哪里评论。
            </p>
          </div>

          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <SortLink href="/comments" active={sort === "latest"}>
              最新
            </SortLink>
            <SortLink href="/comments?sort=hot" active={sort === "hot"}>
              热度
            </SortLink>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700">
            暂时还没有评论
          </div>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id}>
                <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-4 flex items-start gap-3">
                    <Avatar
                      src={comment.author.avatarUrl}
                      name={comment.author.username}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {comment.author.username}
                        </span>
                        {comment.author.isAdmin && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                            管理员
                          </span>
                        )}
                        {comment.parentId && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            回复
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                        {comment.editedAt && (
                          <span className="text-xs text-zinc-400">已编辑</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {comment.isHidden ? (
                    <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm italic text-zinc-400 dark:bg-zinc-900/60">
                      [该评论已被隐藏]
                    </div>
                  ) : (
                    <div
                      className="markdown-body text-sm text-zinc-700 dark:text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
                    />
                  )}

                  <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>👍 {comment.likeCount.toLocaleString()}</span>
                      <span>👎 {comment.dislikeCount.toLocaleString()}</span>
                      <span>
                        评论于：
                        <Link
                          href={`/models/${comment.model.slug}`}
                          className="font-medium text-zinc-700 hover:text-blue-600 hover:underline dark:text-zinc-300 dark:hover:text-blue-400"
                        >
                          {comment.model.name}
                        </Link>
                        <span className="mx-1">·</span>
                        <Link
                          href={`/rankings/${comment.model.category.slug}`}
                          className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
                        >
                          {comment.model.category.name}
                        </Link>
                      </span>
                    </div>
                    <Link
                      href={`/models/${comment.model.slug}`}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      查看模型 →
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className="h-10 w-10 rounded-full bg-zinc-100 object-cover dark:bg-zinc-900"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
