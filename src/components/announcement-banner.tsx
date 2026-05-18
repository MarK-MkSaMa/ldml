/**
 * 排行榜顶部的公告横条
 *
 * 服务端组件：
 *   - 读取当前应展示的公告（active + pinned 最新一条）
 *   - 检查 cookie 中的 dismiss 标记，已关闭则不渲染
 *
 * 关闭按钮是客户端组件 BannerDismiss，写 cookie 后整页 refresh。
 */
import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveBannerAnnouncement } from "@/lib/announcements";
import { BannerDismiss } from "./banner-dismiss";

export async function AnnouncementBanner() {
  const a = await getActiveBannerAnnouncement();
  if (!a) return null;

  const cookieStore = await cookies();
  const dismissed = cookieStore.get("dismissed_announcement")?.value;
  // dismiss 的值是被关掉的那条公告 id；同一条不再显示，新公告会重新出现
  if (dismissed === a.id) return null;

  // 简短预览：截取正文前 80 字符
  const preview = a.content.length > 80 ? a.content.slice(0, 80) + "…" : a.content;

  return (
    <div className="border-b border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
            公告
          </span>
          <Link
            href={`/announcements/${a.id}`}
            className="min-w-0 truncate text-sm text-blue-900 hover:underline dark:text-blue-100"
            title={a.title}
          >
            <span className="font-medium">{a.title}</span>
            <span className="ml-2 text-blue-800/70 dark:text-blue-200/70">
              · {preview}
            </span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <Link
            href="/announcements"
            className="text-blue-700 hover:underline dark:text-blue-300"
          >
            全部
          </Link>
          <BannerDismiss announcementId={a.id} />
        </div>
      </div>
    </div>
  );
}
