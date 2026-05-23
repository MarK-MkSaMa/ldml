/**
 * 鼓励 GitHub Star 的底部横条
 *
 * 行为：
 * - 服务端读 cookie，已 dismiss 则不渲染
 * - 默认显示在所有前台页面（admin 页面除外）
 * - 关闭后 30 天内不再出现
 */
import { cookies } from "next/headers";
import { StarBannerDismiss } from "./star-banner-dismiss";

const REPO_URL = "https://github.com/MarK-MkSaMa/ldml";

export async function StarBanner() {
  const cookieStore = await cookies();
  if (cookieStore.get("dismissed_star_banner")?.value === "1") {
    return null;
  }

  return (
    <div className="border-t border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2.5">
        <div className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-100">
          <span aria-hidden>⭐</span> 觉得 LDML 有用？到{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
          >
            GitHub
          </a>{" "}
          点一颗星支持作者，让更多人看到这个站
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            前往 Star ↗
          </a>
          <StarBannerDismiss />
        </div>
      </div>
    </div>
  );
}
