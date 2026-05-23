/**
 * 站点底部
 *
 * - Star 提示横条（cookie 关闭 30 天内不显示）
 * - 链接列表 + 版权
 */
import Link from "next/link";
import { StarBanner } from "./star-banner";

export function SiteFooter() {
  return (
    <>
      <StarBanner />
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
          <div>LDML · Linux DO 大模型排行榜 · 由社区用户投票产生</div>
          <nav className="flex gap-4">
            <Link
              href="/about"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              关于
            </Link>
            <Link
              href="/announcements"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              公告
            </Link>
            <a
              href="https://github.com/MarK-MkSaMa/ldml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              GitHub
            </a>
            <a
              href="https://linux.do/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Linux DO
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
