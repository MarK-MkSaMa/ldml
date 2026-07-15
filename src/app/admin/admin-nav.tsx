"use client";

/**
 * 后台导航
 * 客户端组件：负责当前路由高亮，以及窄屏抽屉的开合。
 */
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "仪表盘", exact: true },
  { href: "/admin/announcements", label: "公告管理" },
  { href: "/admin/models", label: "模型管理" },
  { href: "/admin/model-requests", label: "模型申请" },
  { href: "/admin/benchmarks", label: "基准测试" },
  { href: "/admin/subjective-tests", label: "主观测试" },
  { href: "/admin/votes", label: "投票管理" },
  { href: "/admin/categories", label: "分类管理" },
  { href: "/admin/dimensions", label: "维度管理" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/comments", label: "评论审核" },
  { href: "/admin/reports", label: "举报队列" },
  { href: "/admin/keywords", label: "关键字黑名单" },
  { href: "/admin/abuse", label: "评分异常检测" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3" aria-label="后台导航">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        aria-expanded={open}
        aria-controls="admin-mobile-navigation"
      >
        <Menu className="h-4 w-4" aria-hidden />
        菜单
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="关闭后台菜单"
          />
          <aside
            id="admin-mobile-navigation"
            className="relative flex h-dvh w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="font-semibold">后台导航</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="关闭后台菜单"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AdminNav() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white py-6 lg:block dark:border-zinc-800 dark:bg-zinc-900">
      <NavLinks />
    </aside>
  );
}
