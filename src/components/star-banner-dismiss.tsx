"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function StarBannerDismiss() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function dismiss() {
    // 30 天
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `dismissed_star_banner=1; path=/; max-age=${maxAge}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="关闭"
      className="rounded p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
    >
      ×
    </button>
  );
}
