/**
 * 站点顶部导航
 *
 * 所有前台页面共用（排行榜、模型详情、公告列表/详情、登录页等）。
 * 包含：站名 + 公告入口 + SessionMenu
 */
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { SessionMenu } from "./session-menu";

export function SiteHeader({
  maxWidth = "max-w-6xl",
}: {
  maxWidth?: string;
}) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div
        className={`mx-auto flex items-center justify-between px-6 py-4 ${maxWidth}`}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold">
            LDML 大模型排行榜
          </Link>
          <Link
            href="/announcements"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="查看全部公告"
          >
            <Megaphone className="h-4 w-4" aria-hidden />
            <span>公告</span>
          </Link>
        </div>
        <SessionMenu />
      </div>
    </header>
  );
}
