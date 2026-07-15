/**
 * 站点顶部导航
 *
 * 所有前台页面共用（排行榜、模型详情、公告列表/详情、登录页等）。
 * 包含：站名 + 公告入口 + SessionMenu
 */
import Link from "next/link";
import { SessionMenu } from "./session-menu";
import { SiteNav } from "./site-nav";

export function SiteHeader({
  maxWidth = "max-w-6xl",
}: {
  maxWidth?: string;
}) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div
        className={`mx-auto flex flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:gap-5 md:py-4 ${maxWidth}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 md:contents">
          <Link href="/" className="shrink-0 text-base font-semibold sm:text-lg md:order-1">
            LDML 大模型排行榜
          </Link>
          <div className="shrink-0 md:order-3">
            <SessionMenu />
          </div>
        </div>
        <div className="min-w-0 md:order-2 md:flex-1">
          <SiteNav />
        </div>
      </div>
    </header>
  );
}
