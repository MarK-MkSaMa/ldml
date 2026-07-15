/**
 * 管理后台布局
 *
 * 所有 /admin/* 页面共用：
 *   - 鉴权守卫：未登录 → /login；非管理员 → 显示 403
 *   - 侧边栏导航 + 顶部
 *
 * 因为是 Server Component，session 检查在服务器端完成，
 * 非管理员根本拿不到 admin 子页的 HTML。
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentUserFresh } from "@/lib/current-user";
import { AdminMobileNav, AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserFresh();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!user.isAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold tracking-tight">403 · 无权访问</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            后台仅管理员可见。你当前以 <strong>{user.username}</strong> 登录，
            但没有管理员权限。
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← 返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* 顶部 */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <AdminMobileNav />
            <Link href="/admin" className="truncate text-base font-semibold sm:text-lg">
              LDML · 后台
            </Link>
            <Link
              href="/"
              className="hidden shrink-0 text-sm text-zinc-500 hover:text-zinc-900 sm:inline dark:hover:text-zinc-100"
            >
              ← 返回前台
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden max-w-40 truncate text-zinc-700 md:inline dark:text-zinc-300">
              {user.username}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                登出
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* 主体：侧边栏 + 内容 */}
      <div className="flex min-w-0 flex-1">
        <AdminNav />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
