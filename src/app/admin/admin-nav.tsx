"use client";

/**
 * 后台侧边栏导航
 * 客户端组件：需要 usePathname 高亮当前菜单项
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "仪表盘", exact: true },
  { href: "/admin/announcements", label: "公告管理" },
  { href: "/admin/models", label: "模型管理" },
  { href: "/admin/votes", label: "投票管理" },
  { href: "/admin/categories", label: "分类管理" },
  { href: "/admin/dimensions", label: "维度管理" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/comments", label: "评论审核" },
  { href: "/admin/reports", label: "举报队列" },
  { href: "/admin/keywords", label: "关键字黑名单" },
  { href: "/admin/abuse", label: "评分异常检测" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
      <nav className="space-y-1 px-3">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
