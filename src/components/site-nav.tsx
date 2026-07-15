"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, ListChecks, MessageSquare, Megaphone, Trophy } from "lucide-react";

const NAV_ITEMS = [
  { href: "/rankings/text", match: "/rankings", label: "评分排行榜", icon: Trophy },
  { href: "/benchmarks", match: "/benchmarks", label: "基准测试", icon: FlaskConical },
  { href: "/subjective-tests", match: "/subjective-tests", label: "主观测试", icon: ListChecks },
  { href: "/comments", match: "/comments", label: "全站评论", icon: MessageSquare },
  { href: "/announcements", match: "/announcements", label: "公告", icon: Megaphone },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:px-0 md:pb-0"
      aria-label="主导航"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors ${
              active
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
