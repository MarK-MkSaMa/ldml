"use client";

/**
 * 公告横条的关闭按钮
 *
 * 点击：写 cookie 标记此条 id 已关闭 + 触发页面 refresh，让服务端组件重新判断
 * 注意：cookie 在客户端写时不能 HttpOnly，但这只是 UI 标记不涉及安全，可接受。
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function BannerDismiss({ announcementId }: { announcementId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function dismiss() {
    // 24 小时后过期
    const maxAge = 60 * 60 * 24;
    document.cookie = `dismissed_announcement=${announcementId}; path=/; max-age=${maxAge}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="关闭公告"
      className="rounded p-0.5 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
    >
      ×
    </button>
  );
}
